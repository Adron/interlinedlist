import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getListProperties, getListDataRowById } from '@/lib/lists/queries';
import Link from 'next/link';
import EditRowForm from './EditRowForm';

interface EditRowPageProps {
  params: { id: string; rowId: string };
}

export default async function EditRowPage({ params }: EditRowPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id: listId, rowId } = params;

  // Fetch list properties
  const properties = await getListProperties(listId, user.id);

  if (!properties) {
    notFound();
  }

  // Fetch row data
  const row = await getListDataRowById(rowId, listId, user.id);

  if (!row) {
    notFound();
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="h3 mb-0">Edit Row</h1>
          <Link
            href={`/lists/${listId}`}
            className="btn btn-outline-secondary"
          >
            <i className="bx bx-x me-1"></i>
            Cancel
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <EditRowForm
                listId={listId}
                rowId={rowId}
                fields={properties}
                initialRowData={row}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
