import { QueryClient, QueryKey, UseMutationOptions } from "@tanstack/react-query";

export interface OptimisticContext<TData> {
  previousQueries?: Array<[QueryKey, TData | undefined]>;
  previousData?: TData;
  queryKey: QueryKey;
}

/**
 * Higher-order utility to create standard TanStack Query optimistic mutation options.
 * Handles query cancellation, multi-query snapshot capturing, instant cache patching,
 * rollback on failure, and cache invalidation on completion.
 */
export function createOptimisticMutationOptions<TVariables, TData, TResult = any>(options: {
  queryClient: QueryClient;
  queryKey: QueryKey;
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
  exact?: boolean;
  additionalInvalidations?: QueryKey[];
  onSuccess?: (data: TResult, variables: TVariables, context: OptimisticContext<TData> | undefined) => void;
  onError?: (error: any, variables: TVariables, context: OptimisticContext<TData> | undefined) => void;
}): UseMutationOptions<TResult, any, TVariables, OptimisticContext<TData>> {
  const { queryClient, queryKey, updateFn, exact = false, additionalInvalidations = [], onSuccess, onError } = options;

  return {
    onMutate: async (variables: TVariables): Promise<OptimisticContext<TData>> => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey, exact });

      // 2. Snapshot the previous values for all matching queries (handles both prefix queries and exact queries)
      const previousQueries = queryClient.getQueriesData<TData>({ queryKey, exact });
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // 3. Optimistically update all matching queries
      queryClient.setQueriesData<TData>({ queryKey, exact }, (old) => updateFn(old, variables));

      // 4. Return context containing the snapshot tuples
      return { previousQueries, previousData, queryKey };
    },

    onError: (err, variables, context) => {
      // Roll back all matching queries to their previous snapshots
      if (context?.previousQueries && context.previousQueries.length > 0) {
        context.previousQueries.forEach(([key, previousData]) => {
          queryClient.setQueryData(key, previousData);
        });
      } else if (context?.previousData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      onError?.(err, variables, context);
    },

    onSuccess: (data, variables, context) => {
      onSuccess?.(data, variables, context);
    },

    onSettled: () => {
      // Always refetch in background after error or success to ensure true server state
      queryClient.invalidateQueries({ queryKey, exact });
      additionalInvalidations.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  };
}

/**
 * Optimistically updates a single item inside an array/list cache
 */
export function optimisticUpdateItemInList<TItem extends { id: string | number }>(
  list: TItem[] | undefined,
  itemId: string | number,
  patch: Partial<TItem>
): TItem[] {
  if (!list) return [];
  return list.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
}

/**
 * Optimistically appends a new item into an array/list cache
 */
export function optimisticAppendItem<TItem>(
  list: TItem[] | undefined,
  newItem: TItem,
  position: "start" | "end" = "end"
): TItem[] {
  if (!list) return [newItem];
  return position === "start" ? [newItem, ...list] : [...list, newItem];
}

/**
 * Optimistically removes an item from an array/list cache
 */
export function optimisticRemoveItem<TItem extends { id: string | number }>(
  list: TItem[] | undefined,
  itemId: string | number
): TItem[] {
  if (!list) return [];
  return list.filter((item) => item.id !== itemId);
}
