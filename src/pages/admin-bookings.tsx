import { BookingsPage } from './bookings';

/**
 * Admin bookings are the same screen: the page already picks its endpoint and its
 * available actions from the signed-in role, so a second implementation would only
 * be a copy that drifts.
 */
export const AdminBookingsPage = BookingsPage;
