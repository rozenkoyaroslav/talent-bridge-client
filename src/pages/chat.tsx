import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-context';
import { useChats, useMessages, useSendFile, parseFileMessage } from '@/features/chat/api';
import { createChatSocket, type ChatSocket } from '@/features/chat/socket';
import { tokenStore } from '@/shared/api/token-store';
import { queryKeys } from '@/shared/api/query-keys';
import { Avatar, Button, Card, EmptyState, Input, Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { fromNow, fullName } from '@/shared/lib/format';
import type { Message } from '@/entities/types';

export const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [typingIn, setTypingIn] = useState<string | null>(null);
  const socketRef = useRef<ChatSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chats = useChats(search.trim() || undefined);
  const messages = useMessages(chatId);
  const sendFile = useSendFile(chatId);

  const activeChat = useMemo(
    () => chats.data?.find(chat => chat.id === chatId) ?? null,
    [chats.data, chatId],
  );

  /**
   * The socket authenticates during the handshake, so it is rebuilt whenever the
   * access token changes — otherwise a token refresh would leave a connection that
   * fails the next time it reconnects.
   */
  useEffect(() => {
    if (!user) return;

    let disposed = false;
    let socket: ChatSocket | null = null;

    const connect = async (token: string | null) => {
      socket?.disconnect();
      if (!token) return;

      const next = await createChatSocket(token, user.id);
      if (disposed) {
        next.disconnect();
        return;
      }

      socket = next;
      socketRef.current = next;

      next.onMessage((message: Message) => {
        queryClient.setQueryData<Message[]>(queryKeys.messages(message.chatId), current =>
          current?.some(item => item.id === message.id) ? current : [...(current ?? []), message],
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
        setTypingIn(null);
      });

      next.onTyping(setTypingIn);
    };

    void connect(tokenStore.get());
    const unsubscribe = tokenStore.subscribe(token => void connect(token));

    return () => {
      disposed = true;
      unsubscribe();
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.data, typingIn]);

  const send = () => {
    const content = draft.trim();
    if (!content || !chatId) return;

    socketRef.current?.send(chatId, content);
    setDraft('');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="flex max-h-[70vh] flex-col overflow-hidden">
        <div className="border-b border-slate-200 p-3">
          <Input
            placeholder="Search conversations…"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : !chats.data?.length ? (
            <p className="p-4 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            <ul>
              {chats.data.map(chat => {
                const other = chat.participants[0];
                const preview = chat.latestMessage?.content ?? '';

                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${chat.id}`)}
                      className={cn(
                        'flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors hover:bg-slate-50',
                        chat.id === chatId && 'bg-slate-100',
                      )}
                    >
                      <Avatar
                        src={other?.profileImage}
                        firstName={other?.firstName}
                        lastName={other?.lastName}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {other?.companyName ?? fullName(other)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {parseFileMessage(preview) ? '📎 Attachment' : preview || 'No messages yet'}
                        </p>
                      </div>
                      {chat.latestMessage && (
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {fromNow(chat.latestMessage.createdAt)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card className="flex max-h-[70vh] flex-col overflow-hidden">
        {!chatId ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              title="Pick a conversation"
              description="Conversations open automatically when you respond to a vacancy or book a candidate."
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <Avatar
                src={activeChat?.participants[0]?.profileImage}
                firstName={activeChat?.participants[0]?.firstName}
                lastName={activeChat?.participants[0]?.lastName}
              />
              <div>
                <p className="font-medium text-slate-900">
                  {activeChat?.participants[0]?.companyName ?? fullName(activeChat?.participants[0])}
                </p>
                <p className="text-xs text-slate-500">
                  {activeChat?.type === 'USER_WITH_ADMINS' ? 'Support' : 'Direct message'}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
              {messages.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                messages.data?.map(message => {
                  const mine = message.sender.id === user?.id;
                  const fileHref = parseFileMessage(message.content);

                  return (
                    <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                          mine ? 'bg-blue-600 text-white' : 'bg-white text-slate-800',
                        )}
                      >
                        {fileHref ? (
                          <a
                            href={fileHref}
                            target="_blank"
                            rel="noreferrer"
                            className={cn('underline', mine ? 'text-white' : 'text-blue-600')}
                          >
                            📎 Attachment
                          </a>
                        ) : (
                          message.content
                        )}
                        <span
                          className={cn(
                            'mt-1 block text-[11px]',
                            mine ? 'text-blue-100' : 'text-slate-400',
                          )}
                        >
                          {fromNow(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {typingIn === chatId && (
                <p className="text-xs italic text-slate-400">typing…</p>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 p-3">
              <label className="cursor-pointer rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100">
                📎
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) void sendFile.mutateAsync(file);
                    event.target.value = '';
                  }}
                />
              </label>

              <Input
                placeholder="Write a message…"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
              />

              <Button onClick={send} disabled={!draft.trim()}>
                Send
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
