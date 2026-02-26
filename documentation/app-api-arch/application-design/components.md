# Components

## Layout & Navigation

| Component | Purpose |
|----------|---------|
| `Navigation` | Top bar, logo, nav links, user dropdown |
| `NavigationTitle` | Dynamic navigation title |
| `Footer` | Site footer |
| `LeftSidebar` | Message input, widgets (home/dashboard) |
| `RightSidebar` | Secondary content |
| `UserWallSidebar` | Sidebar for public user profile pages |
| `ThemeProvider` | Theme context (system/light/dark) |
| `ThemeBridgeInit` | Sync theme to DOM for Bootstrap |

## Messages

| Component | Purpose |
|-----------|---------|
| `MessageInput` | Compose new message |
| `MessageCard` | Single message display |
| `MessageFeed` | Feed of messages |
| `MessageGrid` | Grid layout for dashboard |
| `MessageTable` | Table layout |
| `MessageReplies` | Display replies to a message |
| `ReplyInput` | Compose a reply |
| `DashboardMessageFeed` | Dashboard-specific feed |
| `LinkMetadataCard` | Link preview card |
| `ClearedStatusBanner` | Banner shown when account is cleared/suspended |
| `CrossPostErrorToast` | Error notification for failed cross-posts |

## Lists

| Component | Purpose |
|-----------|---------|
| `ListsTreeView` | Tree navigation of lists |
| `PublicListsTreeView` | Tree navigation for public lists |
| `ListPreview` | List preview widget |
| `ListsTreePane` | Tree pane for list navigation |
| `ListDataTable` | Table of list rows |
| `ListsDataGrid` | Data grid view of lists |
| `ListsERDDiagram` | ERD diagram for list relationships |
| `ListsTabs` | Tabbed navigation for list views |
| `DynamicListForm` | Form generated from schema |
| `ListSchemaForm` | Edit list schema (fields) |
| `ListBreadcrumbs` | Breadcrumb nav |
| `ListChildLinks` | Links to child lists |
| `ChildLink` | Individual child list link |
| `ParentLink` | Link to parent list |
| `ListConnections` | Message/list connection display |
| `ListDetailActions` | Actions toolbar for list detail page |
| `ListAccessSection` | Manage list watchers and access |
| `WatchedListsDataGrid` | Data grid of watched lists |
| `AddListWatcherButton` | Add a watcher to a list |
| `DeleteListButton` | Delete a list with confirmation |

## Organizations

| Component | Purpose |
|-----------|---------|
| `OrganizationCard` | Card for org in list |
| `OrganizationList` | List of orgs |
| `OrganizationMembers` | Member list |
| `OrganizationMembersDatagrid` | Datagrid view of organization members |
| `OrganizationMembersManagement` | Manage organization members (add/remove/roles) |
| `CreateOrganizationForm` | Create org form |
| `EditOrganizationForm` | Edit org form |
| `UserOrganizations` | Current user's organizations list |
| `UserSelectionDatagrid` | Datagrid for selecting users to add |

## Follows

| Component | Purpose |
|-----------|---------|
| `FollowButton` | Follow/unfollow a user |
| `FollowersList` | List of a user's followers |
| `FollowingList` | List of users a user is following |
| `FollowRequests` | Pending follow requests management |
| `FollowNavigation` | Navigation tabs for follow pages |

## Documents

| Component | Purpose |
|-----------|---------|
| `DocumentEditor` | Markdown document editor |
| `DocumentList` | List of documents |
| `FolderTree` | Folder tree navigation |

## Admin

| Component | Purpose |
|-----------|---------|
| `UserManagement` | Admin user management (list, bulk operations) |
| `EmailLogTable` | Display sent email log |

## Help

| Component | Purpose |
|-----------|---------|
| `HelpSidebar` | Sidebar navigation for help pages |
| `HelpNavWrapper` | Wrapper providing help sidebar context |

## Architecture

| Component | Purpose |
|-----------|---------|
| `ArchitectureTabs` | Tabbed navigation for architecture views |
| `ERDDiagram` | Entity-relationship diagram visualization |
| `TableDataGrid` | Data grid for per-table aggregate views |

## Settings

| Component | Purpose |
|-----------|---------|
| `ConnectedAccountsSection` | Manage linked OAuth accounts (Bluesky, GitHub, Mastodon) |

## User & Profile

| Component | Purpose |
|-----------|---------|
| `Avatar` | User avatar |
| `AvatarPlaceholder` | Placeholder when no avatar is set |
| `ProfileHeader` | Profile header |
| `UserDropdown` | User menu (Help, Settings, Logout) |

## Other

| Component | Purpose |
|-----------|---------|
| `LocationWidget` | Geolocation widget |
| `WeatherWidget` | Weather widget |
| `EmailVerificationBanner` | Banner when email not verified |
| `Logo` | Application logo |
| `LogoutButton` | Logout button |
