"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Order } from "@/types/orders";
import { FileText, Search, ChevronUp, ChevronDown } from "lucide-react";

interface OrderListProps {
  orders: Order[];
  initialQuery: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type SortField = "creationDate" | "customerName";
type SortDirection = "asc" | "desc";

export function OrderList({ orders, initialQuery, page, pageSize, total, totalPages }: OrderListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortField, setSortField] = useState<SortField>("creationDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedOrders = useMemo(() => {
    let result = [...orders];

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "creationDate") {
        const dateA = a.creationDate ? new Date(a.creationDate).getTime() : 0;
        const dateB = b.creationDate ? new Date(b.creationDate).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortField === "customerName") {
        comparison = (a.customerName || "").localeCompare(b.customerName || "");
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [orders, sortField, sortDirection]);

  const updateRoute = (next: { page: number; query: string }) => {
    const params = new URLSearchParams();
    if (next.query.trim()) {
      params.set("query", next.query.trim());
    }
    if (next.page > 1) {
      params.set("page", String(next.page));
    }
    if (pageSize !== 50) {
      params.set("pageSize", String(pageSize));
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateRoute({ page: 1, query: searchQuery });
  };

  const goToPreviousPage = () => {
    if (page <= 1) {
      return;
    }
    updateRoute({ page: page - 1, query: initialQuery });
  };

  const goToNextPage = () => {
    if (page >= totalPages) {
      return;
    }
    updateRoute({ page: page + 1, query: initialQuery });
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-4 text-left text-sm text-gray-700 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">SSP NA Order Tracking</h1>
          <p className="text-gray-600">
            Monitor SSP NA transactions through the order flow interfaces
          </p>
        </div>

        <form className="mb-4 flex items-center gap-3" onSubmit={handleSearchSubmit}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order Ref or File Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-indigo-300 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
          {initialQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                updateRoute({ page: 1, query: "" });
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </form>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages} ({total} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={page <= 1}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goToNextPage}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <th className="px-4 py-4 text-left text-sm text-gray-700 font-semibold">
                    Order Ref
                  </th>
                  <SortHeader field="customerName" label="Distributor" />
                  <th className="px-4 py-4 text-left text-sm text-gray-700 font-semibold">
                    Mark
                  </th>
                  <th className="px-4 py-4 text-left text-sm text-gray-700 font-semibold">
                    Reference
                  </th>
                  <th className="px-4 py-4 text-left text-sm text-gray-700 font-semibold">
                    Invoice Type
                  </th>
                  <th className="px-4 py-4 text-left text-sm text-gray-700 font-semibold">
                    Lines
                  </th>
                  <SortHeader field="creationDate" label="Created" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-4 py-4">
                      <Link 
                        href={`/orders/details?customerOrderReference=${encodeURIComponent(order.orderNumber)}&fileName=${encodeURIComponent(order.fileName || "")}`} 
                        className="flex items-center gap-2 text-indigo-700 hover:text-indigo-900 font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 font-medium">
                      {order.customerName}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate" title={order.mark || ""}>
                      {order.mark || "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate" title={order.consigneeReference || ""}>
                      {order.consigneeReference || "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {order.sspInvoiceType || "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {order.lineCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {formatDate(order.creationDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sortedOrders.length === 0 && (
          <div className="mt-8 text-center p-8 bg-white rounded-lg border border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {initialQuery ? "No matching orders found" : "No orders found"}
            </h3>
            <p className="text-gray-500">
              {initialQuery 
                ? "Try adjusting your search query." 
                : "No SSP orders are currently available in the system."}
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages} ({total} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={page <= 1}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goToNextPage}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
