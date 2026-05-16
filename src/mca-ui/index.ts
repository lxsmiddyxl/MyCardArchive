/**
 * MCA-UI — token-backed primitives (see docs/design-system/DEVELOPER_GUIDE.md).
 * Import from `@/mca-ui` or `@/mca-ui/<component>`.
 */

export { AnimatedNumber } from "./animated-number";
export { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";
export { Button, type ButtonProps, type ButtonVariant } from "./button";
export { CatalogCardPreview } from "./catalog-card-preview";
export { CardMetadataPanel, type CardMetadataPanelData } from "./card-metadata-panel";
export { CardConfidenceBadge } from "./card-confidence-badge";
export { CardHistoryPanel } from "./card-history-panel";
export { BinderSetInsights } from "./binder-set-insights";
export { BinderOverviewPanel } from "./binder/BinderOverviewPanel";
export { BinderSetProgressList } from "./binder/BinderSetProgressList";
export { BinderDistributionPanel } from "./binder/BinderDistributionPanel";
export { BinderPageView } from "./binder/BinderPageView";
export { BinderPageNavigation } from "./binder/BinderPageNavigation";
export { BinderSlotView } from "./binder/BinderSlotView";
export { BinderThemeSelector } from "./binder/BinderThemeSelector";
export { LayoutModeSelector } from "./binder/LayoutModeSelector";
export { BinderVisibilitySelector } from "./binder/BinderVisibilitySelector";
export { BinderActivityFeed } from "./binder/BinderActivityFeed";
export { BinderComments } from "./binder/BinderComments";
export { BinderReactions } from "./binder/BinderReactions";
export { PublicBinderPage } from "./binder/PublicBinderPage";
export { BinderExplorePage } from "./binder/BinderExplorePage";
export { UserProfilePage } from "./profile/UserProfilePage";
export { UserProfileEditor } from "./profile/UserProfileEditor";
export { FollowButton } from "./profile/FollowButton";
export { FollowersList } from "./profile/FollowersList";
export { FollowingList } from "./profile/FollowingList";
export { BinderSubscribeButton } from "./binder/BinderSubscribeButton";
export { SubscriberList } from "./binder/SubscriberList";
export { BinderPresenceBar } from "./binder/BinderPresenceBar";
export { NotificationsBell } from "./notifications/NotificationsBell";
export { NotificationsPanel } from "./notifications/NotificationsPanel";
export { ExploreActivityFeed } from "./explore/ExploreActivityFeed";
export { PendingOfflinePanel } from "./pending-offline-panel";
export { PendingOfflineScansPanel } from "./pending-offline-scans-panel";
export { CardScanCandidates } from "./card-scan-candidates";
export { ScanHistoryPanel } from "./scan-history-panel";
export { ScanVariantThumb } from "./scan-variant-thumb";
export { CardVariantSelector } from "./card-variant-selector";
export { CatalogAutocompleteRow, CatalogCombobox, type CatalogComboboxProps } from "./catalog-combobox";
export { CatalogSuggestionsStrip } from "./catalog-suggestions-strip";
export { CardSuggestionsStrip } from "./card-suggestions-strip";
export { Card, type CardProps } from "./card";
export { MCAErrorBoundary, type MCAErrorBoundaryProps } from "./error-boundary";
export { ChartContainer, type ChartContainerProps } from "./chart-container";
export { Field, type FieldProps } from "./field";
export { Icon, type IconProps } from "./icon";
export { InlineError } from "./inline-error";
export { InlineSuccess } from "./inline-success";
export { Input, mcaInputClassName, type InputProps } from "./input";
export { LoadingButton, LoadingSpinner } from "./loading-button";
export { MenuRowButton, type MenuRowButtonProps } from "./menu-row-button";
export { MetricBlock, MetricGrid, type MetricBlockProps, type MetricGridProps } from "./metric-block";
export { ModalBase, type ModalBaseProps } from "./modal-base";
export { NavBackLink, type NavBackLinkProps } from "./nav-back-link";
export {
  NavDropdown,
  NavDropdownLink,
  useNavDropdownClose,
} from "./nav-dropdown";
export { NavToolbarButton, type NavToolbarButtonProps } from "./nav-toolbar-button";
export { Panel, type PanelProps } from "./panel";
export { RemoteCardThumb, type RemoteCardThumbProps } from "./remote-card-thumb";
export { SectionShell, type SectionShellProps } from "./section";
export { TooltipSurface } from "./tooltip-surface";
export { TradeStatusBadge, type TradeStatusBadgeProps } from "./trade-status-badge";
