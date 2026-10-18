import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgets as api } from '../api';

export const budgetKeys = {
  all: ['budgets'],
  list: (params) => ['budgets', 'list', params],
};

export function useBudgets(params) {
  return useQuery({
    queryKey: budgetKeys.list(params),
    queryFn: () => api.getAll(params).then((res) => res.data),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}
