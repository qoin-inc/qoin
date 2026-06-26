import Card from '@/components/Card';

export default function AdminCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`admin-card ${className ?? ''}`}>
      {children}
    </Card>
  );
}
