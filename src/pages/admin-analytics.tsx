import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEmployerAnalytics, useMonthlyRegistrations, useUserAnalytics } from '@/features/admin/api';
import { Card, Field, PageHeader, Select, Skeleton, StatusBadge } from '@/shared/ui';
import { ListShell } from '@/shared/ui/list-shell';
import { Role } from '@/entities/types';
import { humanize } from '@/shared/lib/format';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#0f172a',
  STUDENT: '#2563eb',
  EMPLOYER: '#10b981',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export const AdminAnalyticsPage = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);

  const counts = useUserAnalytics();
  const monthly = useMonthlyRegistrations(year, role || undefined);
  const employers = useEmployerAnalytics({ pagination: { page, limit: 10 } });

  const pieData = Object.entries(counts.data?.byRole ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <>
      <PageHeader title="Analytics" description="Platform totals, registrations and employer activity." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Total accounts</p>
          {counts.isLoading ? (
            <Skeleton className="mt-2 h-9 w-24" />
          ) : (
            <p className="mt-1 text-3xl font-semibold text-slate-900">{counts.data?.total ?? 0}</p>
          )}

          <div className="mt-4 space-y-1.5">
            {Object.entries(counts.data?.byRole ?? {}).map(([name, value]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ROLE_COLORS[name] ?? '#94a3b8' }}
                  />
                  {humanize(name)}
                </span>
                <span className="font-medium text-slate-800">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-2 text-sm text-slate-500">Accounts by role</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={ROLE_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <div className="grid gap-3">
            <Field label="Year">
              <Select value={year} onChange={event => setYear(Number(event.target.value))}>
                {YEARS.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Role">
              <Select value={role} onChange={event => setRole(event.target.value as Role | '')}>
                <option value="">All roles</option>
                {Object.values(Role).map(value => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </Select>
            </Field>

            <p className="text-xs text-slate-500">
              The API returns the raw accounts for the period; the monthly buckets are computed on
              the client.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <p className="mb-3 text-sm text-slate-500">Registrations in {year}</p>
        <div className="h-64">
          {monthly.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Employers</h2>

        <ListShell query={employers} onPageChange={setPage} emptyTitle="No employers yet">
          {items => (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Active vacancies</th>
                    <th className="px-4 py-3 text-right font-medium">In practice</th>
                    <th className="px-4 py-3 text-right font-medium">In work</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(employer => (
                    <tr key={employer.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{employer.companyName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {employer.firstName} {employer.lastName}
                        <span className="block text-xs text-slate-400">{employer.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={employer.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{employer.activeVacancies}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {employer.studentsInPractice}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{employer.studentsInWork}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </ListShell>
      </div>
    </>
  );
};
