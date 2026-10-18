import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurring as api } from '../api';

export const recurringKeys = {
  all: ['recurring'],
};

export function useRecurringRules() {
  return useQuery({
    queryKey: recurringKeys.all,
    queryFn: () => api.getAll().then((res) => res.data),
  });
}

export function useCreateRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

export function useGenerateRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month) => api.generate(month).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
