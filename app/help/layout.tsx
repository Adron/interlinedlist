import HelpNavWrapper from '@/components/help/HelpNavWrapper';

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <HelpNavWrapper />
        <div className="col-md-9 col-12">
          {children}
        </div>
      </div>
    </div>
  );
}
