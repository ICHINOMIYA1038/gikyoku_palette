"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  className?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  className,
}: PaginationProps) {
  const searchParams = useSearchParams();

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    return `/?${params.toString()}`;
  };

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== -1) {
      pages.push(-1);
    }
  }

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)}>
      {currentPage > 1 && (
        <Button variant="outline" size="sm" render={<Link href={createPageUrl(currentPage - 1)} />}>
          前へ
        </Button>
      )}
      {pages.map((page, i) =>
        page === -1 ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            render={<Link href={createPageUrl(page)} />}
          >
            {page}
          </Button>
        )
      )}
      {currentPage < totalPages && (
        <Button variant="outline" size="sm" render={<Link href={createPageUrl(currentPage + 1)} />}>
          次へ
        </Button>
      )}
    </nav>
  );
}
