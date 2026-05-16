import { createNotification } from "@/lib/notifications/db";
import { logger } from "@/lib/telemetry/logger";
import type { Json } from "@/lib/supabase/types";
import { createServiceRoleClient } from "@/lib/supabase/service";

function service() {
  return createServiceRoleClient();
}

function payload(extra: Record<string, unknown>): Json {
  return extra as Json;
}

async function notify(
  recipientId: string,
  type: string,
  title: string,
  body: string | null,
  extra: Record<string, unknown>
): Promise<void> {
  const svc = service();
  if (!svc) return;

  const r = await svc
    .from("notifications")
    .insert({
      user_id: recipientId,
      type,
      title,
      body,
      trade_id: null,
      payload: payload(extra),
    })
    .select("id")
    .single();

  if (r.error) {
    const fallback = await createNotification(svc, recipientId, type, title, body, null);
    if (!fallback.ok) {
      logger.warn({
        eventType: "binder_notification.failed",
        userId: recipientId,
        success: false,
        payloadSummary: { type, error: r.error.message },
      });
    }
    return;
  }

  logger.info({
    eventType: "binder_notification.sent",
    userId: recipientId,
    success: true,
    payloadSummary: { type, notificationId: r.data?.id },
  });
}

export async function notifyNewFollower(input: {
  followedUserId: string;
  followerId: string;
  followerDisplay: string;
}): Promise<void> {
  await notify(
    input.followedUserId,
    "binder_new_follower",
    "New follower",
    `${input.followerDisplay} started following you.`,
    { follower_id: input.followerId }
  );
}

export async function notifyBinderSubscribed(input: {
  ownerUserId: string;
  subscriberId: string;
  subscriberDisplay: string;
  binderId: string;
  binderName: string;
}): Promise<void> {
  await notify(
    input.ownerUserId,
    "binder_subscribed",
    "New binder subscriber",
    `${input.subscriberDisplay} subscribed to ${input.binderName}.`,
    {
      binder_id: input.binderId,
      subscriber_id: input.subscriberId,
    }
  );
}

export async function notifyBinderComment(input: {
  ownerUserId: string;
  actorId: string;
  actorDisplay: string;
  binderId: string;
  binderName: string;
  preview: string;
}): Promise<void> {
  if (input.ownerUserId === input.actorId) return;
  await notify(
    input.ownerUserId,
    "binder_comment",
    "New binder comment",
    `${input.actorDisplay} commented on ${input.binderName}: ${input.preview}`,
    { binder_id: input.binderId, actor_id: input.actorId }
  );
}

export async function notifyBinderReaction(input: {
  ownerUserId: string;
  actorId: string;
  actorDisplay: string;
  binderId: string;
  binderName: string;
  emoji: string;
}): Promise<void> {
  if (input.ownerUserId === input.actorId) return;
  await notify(
    input.ownerUserId,
    "binder_reaction",
    "Binder reaction",
    `${input.actorDisplay} reacted ${input.emoji} on ${input.binderName}.`,
    { binder_id: input.binderId, actor_id: input.actorId, emoji: input.emoji }
  );
}

export async function notifyBinderVisibilityChanged(input: {
  subscriberUserId: string;
  binderId: string;
  binderName: string;
  visibility: string;
}): Promise<void> {
  await notify(
    input.subscriberUserId,
    "binder_visibility_changed",
    "Binder visibility updated",
    `${input.binderName} is now ${input.visibility}.`,
    { binder_id: input.binderId, visibility: input.visibility }
  );
}

export async function notifyBinderCardAdded(input: {
  subscriberUserId: string;
  binderId: string;
  binderName: string;
  cardName?: string;
}): Promise<void> {
  await notify(
    input.subscriberUserId,
    "binder_card_added",
    "Binder update",
    input.cardName
      ? `A card was added to ${input.binderName}: ${input.cardName}.`
      : `A card was added to ${input.binderName}.`,
    { binder_id: input.binderId, card_name: input.cardName ?? null }
  );
}

export async function notifySubscribersCardAdded(
  subscriberIds: string[],
  binderId: string,
  binderName: string,
  cardName?: string
): Promise<void> {
  const unique = [...new Set(subscriberIds)];
  await Promise.all(
    unique.map((subscriberUserId) =>
      notifyBinderCardAdded({ subscriberUserId, binderId, binderName, cardName })
    )
  );
}

export async function notifySubscribersVisibilityChanged(
  subscriberIds: string[],
  binderId: string,
  binderName: string,
  visibility: string
): Promise<void> {
  const unique = [...new Set(subscriberIds)];
  await Promise.all(
    unique.map((subscriberUserId) =>
      notifyBinderVisibilityChanged({
        subscriberUserId,
        binderId,
        binderName,
        visibility,
      })
    )
  );
}
