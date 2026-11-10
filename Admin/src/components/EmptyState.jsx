const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center">
    {Icon && <Icon className="mb-3 h-8 w-8 text-muted-foreground" />}
    <p className="font-semibold">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
