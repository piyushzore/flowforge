export const sampleCustomers = [
  { id: 1, name: 'Acme Corp', email: 'contact@acme.com', company: 'Acme', plan: 'Enterprise', mrr: 2500, signup_date: '2023-01-15', last_login: '2023-10-01', country: 'US', status: 'active' },
  { id: 2, name: 'TechStart', email: 'hello@techstart.io', company: 'TechStart', plan: 'Growth', mrr: 800, signup_date: '2023-03-22', last_login: '2023-10-02', country: 'UK', status: 'active' },
  { id: 3, name: 'DataFlow', email: 'info@dataflow.co', company: 'DataFlow', plan: 'Starter', mrr: 150, signup_date: '2023-06-10', last_login: '2023-09-28', country: 'CA', status: 'inactive' },
  { id: 4, name: 'CloudNine', email: 'team@cloudnine.dev', company: 'CloudNine', plan: 'Growth', mrr: 1200, signup_date: '2023-02-05', last_login: '2023-10-03', country: 'AU', status: 'active' },
  { id: 5, name: 'NetPrime', email: 'ops@netprime.com', company: 'NetPrime', plan: 'Enterprise', mrr: 3800, signup_date: '2022-11-20', last_login: '2023-10-04', country: 'DE', status: 'active' },
];

export const sampleOrders = [
  { order_id: 'ORD-101', customer_id: 1, product: 'Widget A', quantity: 10, price: 50, total: 500, order_date: '2023-09-01', status: 'delivered', shipping_method: 'standard' },
  { order_id: 'ORD-102', customer_id: 2, product: 'Widget B', quantity: 5, price: 100, total: 500, order_date: '2023-09-05', status: 'shipped', shipping_method: 'express' },
];

export const sampleProducts = [
  { id: 'P1', name: 'Widget A', category: 'Hardware', price: 50, stock: 1000, sku: 'WA-001', created_at: '2022-01-01' },
];

export const sampleLeads = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', company: 'Example Inc', source: 'Website', stage: 'New', value: 5000, created_at: '2023-10-01' },
];

export const sampleEvents = [
  { event_id: 'E1', user_id: 1, event_type: 'page_view', page: '/home', timestamp: '2023-10-01T10:00:00Z', device: 'desktop', browser: 'chrome' },
];
