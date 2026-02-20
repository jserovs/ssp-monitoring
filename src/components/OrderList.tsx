"use client";

import Link from "next/link";
import { Order } from "@/types/orders";
import { FileText } from "lucide-react";

interface OrderListProps {
  orders: Order[];
}

export function OrderList({ orders }: OrderListProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">SSP NA Order Tracking</h1>
          <p className="text-gray-600">
            Monitor SSP NA transactions through the order flow interfaces
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <th className="px-4 py-4 text-left text-sm text-gray-700 font-semibold">
                    Order Ref
                  </th>
                  <th className="px-4 py-4 text-left text-sm text-gray-700 font-semibold">
                    Distributor
                  </th>
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
                  <th className="px-4 py-4 text-left text-sm text-gray-700 font-semibold">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-4 py-4">
                      <Link 
                        href={`/orders/${order.orderNumber}`} 
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

        {orders.length === 0 && (
          <div className="mt-8 text-center p-8 bg-white rounded-lg border border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">No SSP orders are currently available in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
