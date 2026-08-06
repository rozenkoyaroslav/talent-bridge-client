import { http, HttpResponse } from 'msw';
import { db, persistDb } from '../db';
import { buildMeta, currentUser, mockDelay, paginate, parseListParams, publicUser } from '../helpers';
import { ChatType, type Message } from '@/entities/types';
import { API_PREFIX } from '@/shared/api/http';

const url = (path: string) => `*${API_PREFIX}${path}`;

/** Listeners registered by the mock socket, so pushed messages reach open windows. */
type MessageListener = (message: Message) => void;
const listeners = new Set<MessageListener>();

export const onMockMessage = (listener: MessageListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitMockMessage = (message: Message) => {
  listeners.forEach(listener => listener(message));
};

export const appendMessage = (chatId: string, senderId: string, content: string): Message => {
  const sender = db.users.find(user => user.id === senderId)!;

  const message: Message = {
    id: crypto.randomUUID(),
    chatId,
    content,
    createdAt: new Date().toISOString(),
    sender: {
      id: sender.id,
      firstName: sender.firstName,
      lastName: sender.lastName,
      profileImage: sender.profileImage,
    },
  };

  db.messages.push(message);
  persistDb();
  emitMockMessage(message);

  return message;
};

/**
 * Mirrors `ChatsService.startConversation`: reuse the private chat if it exists,
 * otherwise create one, and post the opening message in the same step.
 */
export const openConversation = (senderId: string, recipientId: string, content?: string) => {
  let chat = db.chats.find(
    item =>
      item.type === ChatType.PRIVATE &&
      item.participantIds.length === 2 &&
      item.participantIds.includes(senderId) &&
      item.participantIds.includes(recipientId),
  );

  if (!chat) {
    chat = {
      id: crypto.randomUUID(),
      type: ChatType.PRIVATE,
      createdAt: new Date().toISOString(),
      participantIds: [senderId, recipientId],
    };
    db.chats.push(chat);
  }

  const trimmed = content?.trim();
  if (trimmed) appendMessage(chat.id, senderId, trimmed);

  persistDb();

  return chat;
};

const chatView = (chatId: string, viewerId: string) => {
  const chat = db.chats.find(item => item.id === chatId)!;
  const messages = db.messages
    .filter(message => message.chatId === chatId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    id: chat.id,
    type: chat.type,
    createdAt: chat.createdAt,
    participants: chat.participantIds
      .filter(id => id !== viewerId)
      .map(id => {
        const user = publicUser(db.users.find(item => item.id === id)!);
        const employer = db.employerProfiles.find(profile => profile.userId === id);

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          patronymic: user.patronymic,
          role: user.role,
          profileImage: user.profileImage,
          ...(employer ? { companyName: employer.companyName } : {}),
        };
      }),
    latestMessage: messages.at(-1) ?? null,
  };
};

export const chatHandlers = [
  http.get(url('/chat/my'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const chats = db.chats
      .filter(chat => chat.participantIds.includes(user.id))
      .map(chat => chatView(chat.id, user.id))
      .sort((a, b) =>
        (b.latestMessage?.createdAt ?? b.createdAt).localeCompare(
          a.latestMessage?.createdAt ?? a.createdAt,
        ),
      );

    return HttpResponse.json({ chats });
  }),

  http.get(url('/chat/search-my'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const search = new URL(request.url).searchParams.get('search')?.toLowerCase() ?? '';

    const chats = db.chats
      .filter(chat => chat.participantIds.includes(user.id))
      .map(chat => chatView(chat.id, user.id))
      .filter(chat =>
        chat.participants.some(participant =>
          `${participant.firstName} ${participant.lastName} ${participant.companyName ?? ''}`
            .toLowerCase()
            .includes(search),
        ),
      );

    return HttpResponse.json({ chats });
  }),

  http.get(url('/message/by-chat-id'), async ({ request }) => {
    await mockDelay();
    const requestUrl = new URL(request.url);
    const chatId = requestUrl.searchParams.get('chatId') ?? '';
    const { pagination } = parseListParams(requestUrl);

    const messages = db.messages
      .filter(message => message.chatId === chatId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return HttpResponse.json({
      messages: paginate(messages, pagination),
      metadata: buildMeta(messages.length, pagination),
    });
  }),

  http.post(url('/message/send'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { chatId, content } = (await request.json()) as { chatId: string; content: string };

    return HttpResponse.json(appendMessage(chatId, user.id, content), { status: 201 });
  }),

  http.post(url('/message/send-file/:chatId'), async ({ request, params }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    // The API stores an object key and returns `FILE::<signed-url>`; locally an
    // object URL stands in for the signed URL, and the prefix contract is identical.
    const href = file instanceof File ? URL.createObjectURL(file) : 'demo://attachment.pdf';

    return HttpResponse.json(appendMessage(String(params.chatId), user.id, `FILE::${href}`), {
      status: 201,
    });
  }),
];
