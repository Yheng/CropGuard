import { useState, useMemo, useCallback } from 'react';

interface VirtualizationOptions<T = unknown> {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  items: T[];
}

interface VirtualItem<T = unknown> {
  index: number;
  start: number;
  end: number;
  item: T;
}

export const useVirtualization = <T = unknown>({
  itemHeight,
  containerHeight,
  overscan = 5,
  items
}: VirtualizationOptions<T>) => {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const virtualItems = useMemo(() => {
    const virtualItems: VirtualItem<T>[] = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      virtualItems.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        item: items[i]
      });
    }

    return virtualItems;
  }, [visibleRange, itemHeight, items]);

  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems,
    totalHeight,
    offsetY,
    handleScroll
  };
};

// Hook for infinite scrolling with virtualization
export const useInfiniteVirtualization = <T = unknown>({
  itemHeight,
  containerHeight,
  overscan = 5,
  loadMore,
  hasNextPage,
  isLoading
}: Omit<VirtualizationOptions<T>, 'items'> & {
  loadMore: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
}) => {
  const [items, setItems] = useState<T[]>([]);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const virtualItems = useMemo(() => {
    const virtualItems: VirtualItem<T>[] = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (items[i]) {
        virtualItems.push({
          index: i,
          start: i * itemHeight,
          end: (i + 1) * itemHeight,
          item: items[i]
        });
      }
    }

    return virtualItems;
  }, [visibleRange, itemHeight, items]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const scrollHeight = e.currentTarget.scrollHeight;
    const clientHeight = e.currentTarget.clientHeight;

    setScrollTop(scrollTop);

    // Load more when approaching the end
    if (
      scrollTop + clientHeight >= scrollHeight - itemHeight * 2 &&
      hasNextPage &&
      !isLoading
    ) {
      loadMore();
    }
  }, [itemHeight, hasNextPage, isLoading, loadMore]);

  return {
    items,
    setItems,
    virtualItems,
    totalHeight,
    offsetY: visibleRange.startIndex * itemHeight,
    handleScroll
  };
};

// Hook for grid virtualization
export const useGridVirtualization = <T = unknown>({
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 0,
  items
}: {
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  items: T[];
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);

  const totalHeight = rowsCount * (itemHeight + gap) - gap;
  const totalWidth = columnsCount * (itemWidth + gap) - gap;

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)));
    const endRow = Math.min(
      rowsCount - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap))
    );

    const startCol = Math.max(0, Math.floor(scrollLeft / (itemWidth + gap)));
    const endCol = Math.min(
      columnsCount - 1,
      Math.ceil((scrollLeft + containerWidth) / (itemWidth + gap))
    );

    return { startRow, endRow, startCol, endCol };
  }, [
    scrollTop,
    scrollLeft,
    itemHeight,
    itemWidth,
    gap,
    containerHeight,
    containerWidth,
    rowsCount,
    columnsCount
  ]);

  const virtualItems = useMemo(() => {
    const virtualItems: Array<VirtualItem<T> & { row: number; col: number; x: number; y: number }> = [];
    
    for (let row = visibleRange.startRow; row <= visibleRange.endRow; row++) {
      for (let col = visibleRange.startCol; col <= visibleRange.endCol; col++) {
        const index = row * columnsCount + col;
        if (index < items.length) {
          virtualItems.push({
            index,
            row,
            col,
            start: row * (itemHeight + gap),
            end: (row + 1) * (itemHeight + gap) - gap,
            x: col * (itemWidth + gap),
            y: row * (itemHeight + gap),
            item: items[index]
          });
        }
      }
    }

    return virtualItems;
  }, [visibleRange, itemWidth, itemHeight, gap, columnsCount, items]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  return {
    virtualItems,
    totalHeight,
    totalWidth,
    columnsCount,
    rowsCount,
    handleScroll
  };
};