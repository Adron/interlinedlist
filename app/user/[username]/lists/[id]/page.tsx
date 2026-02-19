import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getPublicListWithAncestorChain, getPublicListProperties } from '@/lib/lists/queries';
import Link from 'next/link';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
import ListChildLinks from '@/components/lists/ListChildLinks';
import ListDataTable from '@/components/lists/ListDataTable';
import AddListWatcherButton from '@/components/AddListWatcherButton';

interface PublicListPageProps {
  params: Promise<{ username: string; id: string }>;
}

export default async function PublicListPage({ params }: PublicListPageProps) {
  const { username, id: listId } = await params;
  const currentUser = await getCurrentUser();

  const result = await getPublicListWithAncestorChain(listId, username);

  if (!result || !result.list) {
    notFound();
  }

  const { list, ancestors } = result;
  const properties = await getPublicListProperties(listId);

  if (!properties || properties.length === 0) {
    notFound();
  }

  const showWatcherButton =
    !!currentUser && currentUser.id !== list.userId;

  const breadcrumbItems = [
    { label: username, href: `/user/${encodeURIComponent(username)}` },
    ...ancestors.map((a) => ({
      label: a.title,
      href: `/user/${encodeURIComponent(username)}/lists/${a.id}`,
    })),
    { label: list.title },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs items={breadcrumbItems} />
      {list.children && list.children.length > 0 && (
        <ListChildLinks children={list.children} ownerUsername={username} />
      )}
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-end align-items-center gap-2">
          <AddListWatcherButton listId={listId} show={showWatcherButton} />
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <ListDataTable
            listId={listId}
            fields={properties}
            dataApiUrl={`/api/users/${encodeURIComponent(username)}/lists/${listId}/data`}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
