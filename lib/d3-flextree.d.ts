declare module "d3-flextree" {
  export interface FlextreeNode<T> {
    data: T;
    x: number;
    y: number;
    parent: FlextreeNode<T> | null;
    children?: FlextreeNode<T>[];
    each(callback: (node: FlextreeNode<T>) => void): this;
  }
  export interface FlextreeLayout<T> {
    (tree: FlextreeNode<T>): FlextreeNode<T>;
    hierarchy(data: T, children?: (d: T) => T[] | undefined): FlextreeNode<T>;
  }
  export function flextree<T>(options: {
    children?: (d: T) => T[] | undefined;
    nodeSize?: (node: FlextreeNode<T>) => [number, number];
    spacing?: number | ((a: FlextreeNode<T>, b: FlextreeNode<T>) => number);
  }): FlextreeLayout<T>;
}
