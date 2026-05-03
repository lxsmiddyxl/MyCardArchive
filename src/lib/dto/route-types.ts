export type {
  BinderMutationResponseDTO,
  BinderPageDTO,
  BinderPageListDTO,
  BinderSlotDTO,
  BinderSlotListDTO,
  BinderSlotsListPayloadDTO,
} from "./binder";

export type CardDetailDTO = {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  set_name: string | null;
  image_url: string | null;
  catalog_card_id: string | null;
  binder_id: string;
  binder_name: string | null;
  for_trade: boolean;
  looking_for: boolean;
};

export type { CommunityCommentDTO } from "./community-feed";

export type ReactionDTO = {
  reaction: string;
  user_id: string;
};
