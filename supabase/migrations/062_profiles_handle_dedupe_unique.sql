-- Resolve duplicate profile handles, then enforce UNIQUE(handle) without swallowing errors.
-- Supersedes the conditional DO block in 060_profile_personality_fields.sql for this constraint.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_handle_unique;

-- Multiple '' / whitespace-only handles: keep one row (earliest), set others to NULL (UNIQUE allows multiple NULLs).
WITH trimmed_empty AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY trim(coalesce(handle, ''))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.profiles
  WHERE handle IS NOT NULL AND trim(handle) = ''
)
UPDATE public.profiles p
SET handle = NULL
FROM trimmed_empty te
WHERE p.id = te.id AND te.rn > 1;

-- Non-empty duplicate handles (case-insensitive match): keep first row per group, suffix _2, _3, ...
WITH ranked AS (
  SELECT
    id,
    trim(handle) AS trimmed,
    row_number() OVER (
      PARTITION BY lower(trim(handle))
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    count(*) OVER (PARTITION BY lower(trim(handle))) AS cnt
  FROM public.profiles
  WHERE handle IS NOT NULL AND trim(handle) <> ''
),
new_handles AS (
  SELECT
    id,
    CASE
      WHEN rn = 1 THEN trimmed
      ELSE trimmed || '_' || rn::text
    END AS new_handle
  FROM ranked
  WHERE cnt > 1
)
UPDATE public.profiles p
SET handle = nh.new_handle
FROM new_handles nh
WHERE p.id = nh.id;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_handle_unique UNIQUE (handle);
