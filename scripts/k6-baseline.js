import http from 'k6/http';
import { check, sleep } from 'k6';

// Replace with a real slug from your database before running
const SLUG = 'WY3Ly9Yd';
const BASE_URL = 'https://shrtn.bustamam.tech';

export const options = {
  vus: 50,
  duration: '30s',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const res = http.get(`${BASE_URL}/${SLUG}`, {
    redirects: 0, // measure the redirect response, not the final destination
  });

  check(res, {
    'status is 301 or 302': (r) => r.status === 301 || r.status === 302,
  });
}
