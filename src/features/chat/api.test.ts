import { describe, expect, it } from 'vitest';
import { parseFileMessage } from './api';
import { renderNotification } from '@/features/notifications/templates';
import { NotificationType, Role, type NotificationItem } from '@/entities/types';

describe('parseFileMessage', () => {
  it('extracts the url from an attachment message', () => {
    expect(parseFileMessage('FILE::https://example.test/a.pdf')).toBe('https://example.test/a.pdf');
  });

  it('returns null for a plain message so it renders as text', () => {
    expect(parseFileMessage('Hello there')).toBeNull();
  });

  it('does not treat a message that merely mentions FILE:: as an attachment', () => {
    expect(parseFileMessage('the prefix is FILE:: in our protocol')).toBeNull();
  });
});

const baseNotification: NotificationItem = {
  id: '1',
  type: NotificationType.VACANCY_RESPONSE,
  createdAt: new Date().toISOString(),
  isRead: false,
  actor: { id: 'a', firstName: 'Ann', lastName: 'Meyer', role: Role.STUDENT, profileImage: null },
  subjectUser: null,
  vacancy: { id: 'v', company: 'Acme' },
  meta: null,
};

describe('renderNotification', () => {
  it('names the actor and the company', () => {
    expect(renderNotification(baseNotification).text).toBe(
      'Ann Meyer responded to the vacancy at Acme.',
    );
  });

  it('reads counts out of meta for digests', () => {
    expect(
      renderNotification({
        ...baseNotification,
        type: NotificationType.NEW_VACANCIES_DIGEST,
        meta: { count: 6, specialization: 'Product Design' },
      }).text,
    ).toBe('6 new vacancies in Product Design.');
  });

  it('degrades to a readable sentence when a relation is missing', () => {
    expect(
      renderNotification({ ...baseNotification, actor: null, vacancy: null }).text,
    ).toBe('Unknown responded to the vacancy at your company.');
  });

  it('links every type it knows to a destination or none at all', () => {
    Object.values(NotificationType).forEach(type => {
      const rendered = renderNotification({ ...baseNotification, type });
      expect(rendered.text).not.toBe(type);
    });
  });
});
