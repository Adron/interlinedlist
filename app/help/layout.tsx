import HelpNavWrapper from '@/components/help/HelpNavWrapper';
import { getAllHelpSearchEntries } from '@/lib/help';

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchEntries = getAllHelpSearchEntries();

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <HelpNavWrapper searchEntries={searchEntries} />
        <div className="col-md-9 col-12">
          {children}
        </div>
      </div>
    </div>
  );
}
