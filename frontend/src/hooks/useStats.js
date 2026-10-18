import { useQuery } from '@tanstack/react-query';
import { stats as api } from '../api';

export const statsKeys = {
  all: ['stats'],
  summary: (params) => ['stats', 'summary', params],
  byCategory: (params) => ['stats', 'by-category', params],
  monthly: () => ['stats', 'monthly'],
  recent: (params) => ['stats', 'recent', params],
};

export function useStatsSummary(params) {
  return useQuery({
    queryKey: statsKeys.summary(params),
    queryFn: () => api.getSummary(params).then((res) => res.data),
  });
}

export function useStatsByCategory(params) {
  return useQuery({
    queryKey: statsKeys.byCategory(params),
    queryFn: () => api.getByCategory(params).then((res) => res.data),
  });
}

export function useStatsMonthly() {
  return useQuery({
    queryKey: statsKeys.monthly(),
    queryFn: () => api.getMonthly().then((res) => res.data),
  });
}

export function useStatsRecent(params) {
  return useQuery({
    queryKey: statsKeys.recent(params),
    queryFn: () => api.getRecent(params).then((res) => res.data),
  });
}
