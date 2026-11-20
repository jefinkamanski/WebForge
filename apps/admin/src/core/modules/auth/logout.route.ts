import { redirect } from 'react-router';
import { logout } from './auth.api.ts';

export async function action() {
  await logout();
  return redirect('/login');
}

export function loader() {
  return redirect('/');
}
