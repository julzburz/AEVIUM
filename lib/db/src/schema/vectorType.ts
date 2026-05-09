import { customType } from "drizzle-orm/pg-core";

export const vector = (name: string, dimensions = 768) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(",")}]`;
    },
    fromDriver(value: string): number[] {
      return value.replace(/^\[|\]$/g, "").split(",").map(Number);
    },
  })(name);
