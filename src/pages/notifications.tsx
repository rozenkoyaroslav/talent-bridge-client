import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMarkRead, useNotifications } from '@/features/notifications/api';
import { renderNotification } from '@/features/notifications/templates';
import { Button, Card, PageHeader } from '@/shared/ui';
import { ListShell } from '@/shared/ui/list-shell';
import { cn } from '@/shared/lib/cn';
import { fromNow } from '@/shared/lib/format';

export const NotificationsPage = () => {
  const [page, setPage] = useState(1);
  const query = useNotifications({ pagination: { page, limit: 20 } });
  const markRead = useMarkRead();

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Everything the platform decided you should know about."
        actions={
          <Button
            variant="secondary"
            disabled={markRead.isPending}
            onClick={() => void markRead.mutateAsync(undefined)}
          >
            Mark all as read
          </Button>
        }
      />

      <ListShell
        query={query}
        onPageChange={setPage}
        emptyTitle="Nothing here yet"
        emptyDescription="Approvals, responses and digests will show up on this page."
      >
        {items => (
          <Card className="divide-y divide-slate-100">
            {items.map(notification => {
              const { text, href } = renderNotification(notification);

              const body = (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      notification.isRead ? 'bg-transparent' : 'bg-blue-600',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm',
                        notification.isRead ? 'text-slate-600' : 'font-medium text-slate-900',
                      )}
                    >
                      {text}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{fromNow(notification.createdAt)}</p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={event => {
                        event.preventDefault();
                        void markRead.mutateAsync([notification.id]);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              );

              return href ? (
                <Link key={notification.id} to={href} className="block hover:bg-slate-50">
                  {body}
                </Link>
              ) : (
                <div key={notification.id}>{body}</div>
              );
            })}
          </Card>
        )}
      </ListShell>
    </>
  );
};
