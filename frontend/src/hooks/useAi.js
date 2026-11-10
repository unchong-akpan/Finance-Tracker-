import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ai } from '../api';
import { transactionKeys } from './useTransactions';

export function useAnalyzeTransactions() {
  return useMutation({
    mutationFn: (transactions) => ai.analyze(transactions).then((res) => res.data),
  });
}

export function useApplyAiSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => ai.apply(updates).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useSuggestCategory() {
  return useMutation({
    mutationFn: (data) => ai.suggest(data).then((res) => res.data),
  });
}
