"use client";

import { useState } from "react";
import Link from "next/link";
import { Order, InterfaceStep, OrderLine } from "@/types/orders";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Circle,
  Package,
  User,
  Calendar,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface OrderTrackingProps {
  order: Order;
}

export function OrderTracking({ order }: OrderTrackingProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-green-50",
          border: "border-green-300",
          text: "text-green-700",
          icon: "text-green-600",
        };
      case "processing":
        return {
          bg: "bg-blue-50",
          border: "border-blue-300",
          text: "text-blue-700",
          icon: "text-blue-600",
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-300",
          text: "text-red-700",
          icon: "text-red-600",
        };
      case "warning":
        return {
          bg: "bg-amber-50",
          border: "border-amber-300",
          text: "text-amber-700",
          icon: "text-amber-600",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-300",
          text: "text-gray-700",
          icon: "text-gray-400",
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-6 h-6" />;
      case "processing":
        return <Clock className="w-6 h-6" />;
      case "error":
        return <AlertCircle className="w-6 h-6" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6" />;
      default:
        return <Circle className="w-6 h-6" />;
    }
  };

  const getLineStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "error":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/orders"
            className="flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Orders</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl mb-2 flex items-center gap-3">
                <Package className="w-8 h-8 text-indigo-600" />
                {order.orderNumber}
              </h1>
              <p className="text-gray-600">
                Track your order through each processing stage
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="mb-8 p-6 bg-white border-gray-200 shadow-sm">
          <h2 className="text-xl mb-4">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-indigo-600 mt-1" />
              <div>
                <div className="text-sm text-gray-500">Distributor</div>
                <div className="mt-1">{order.customerName}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-indigo-600 mt-1" />
              <div>
                <div className="text-sm text-gray-500">Mark</div>
                <div className="mt-1">{order.mark || "-"}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-indigo-600 mt-1" />
              <div>
                <div className="text-sm text-gray-500">Reference</div>
                <div className="mt-1">{order.consigneeReference || "-"}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-indigo-600 mt-1" />
              <div>
                <div className="text-sm text-gray-500">Invoice Type</div>
                <div className="mt-1">{order.sspInvoiceType || "-"}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Interface Steps */}
        <div className="space-y-6">
          {(() => {
            const visibleSteps = order.steps;

            const splitIndex = visibleSteps.findIndex((step) => step.id === "order_split");
            const preSplitSteps = splitIndex > -1 ? visibleSteps.slice(0, splitIndex) : visibleSteps;
            const postSplitSteps: InterfaceStep[] = [];
            const branchMap = new Map<string, InterfaceStep[]>();

            if (splitIndex > -1) {
              const afterSplit = visibleSteps.slice(splitIndex + 1);
              for (const step of afterSplit) {
                const programMatch = step.name.match(/\(([A-Z0-9]+)\)$/);
                const program = programMatch ? programMatch[1] : "";
                if (!program) {
                  postSplitSteps.push(step);
                  continue;
                }
                if (!branchMap.has(program)) {
                  branchMap.set(program, []);
                }
                branchMap.get(program)!.push(step);
              }
            }

            const branchGroups = Array.from(branchMap.entries()).map(([programName, steps]) => ({
              programName,
              steps,
            }));

            const renderStep = (step: InterfaceStep, index: number, totalSteps: number, isBranch = false) => {
              const colors = getStatusColor(step.status);
              const isExpanded = expandedSteps.has(step.id);
              const hasLines = step.lines.length > 0 && !step.hideLines && !step.proofOfDeliveryUrl;
              const isUnimplemented = step.unimplemented;
              const isSplitIndicator = step.id === "order_split";

              return (
                <div key={step.id} className={`relative ${isBranch ? '' : ''}`}>
                  {!isBranch && index < totalSteps - 1 && !isSplitIndicator && (
                    <div className="absolute left-8 top-24 w-0.5 h-12 bg-gradient-to-b from-gray-300 to-gray-200" style={{ zIndex: 0 }} />
                  )}
                  
                  <Card className={`${colors.bg} ${colors.border} border-2 shadow-md hover:shadow-lg transition-all duration-200 ${isUnimplemented ? "opacity-60" : ""} ${isSplitIndicator ? "bg-indigo-50 border-indigo-300" : ""}`}>
                    <div className={`${isUnimplemented ? "p-3" : "p-6"} ${hasLines && !isUnimplemented ? "cursor-pointer" : ""}`} onClick={() => hasLines && !isUnimplemented && toggleStep(step.id)}>
                      <div className="flex items-start gap-4">
                        <div className={`${colors.icon} flex-shrink-0`}>{getStatusIcon(step.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className={`${isUnimplemented ? "text-base" : "text-lg"} ${colors.text} ${isSplitIndicator ? "font-bold text-indigo-700" : ""}`}>
                                {step.name}
                              </h3>
                              {!isUnimplemented && step.description && (
                                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                              )}
                            </div>
                            {hasLines && !isUnimplemented && (
                              <button className={`${colors.text} p-1 hover:bg-white/50 rounded transition-colors`}>
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>
                            )}
                          </div>
                          {!isUnimplemented && (
                            <div className="flex gap-4 mt-3">
                              <div className="bg-white/60 rounded-lg px-3 py-2 border border-gray-200">
                                <div className="text-xs text-gray-500">Status</div>
                                <div className={`mt-1 ${colors.text} capitalize`}>{step.status}</div>
                              </div>
                              {step.startTime && (
                                <div className="bg-white/60 rounded-lg px-3 py-2 border border-gray-200">
                                  <div className="text-xs text-gray-500">Time</div>
                                  <div className="mt-1 text-sm">{step.startTime}</div>
                                </div>
                              )}
                            </div>
                          )}
                          {(step.metadata.errorCount > 0 || step.metadata.warningCount > 0) && (
                            <div className="flex gap-3 mt-4">
                              {step.metadata.errorCount > 0 && (
                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                  {step.metadata.errorCount} Error{step.metadata.errorCount !== 1 ? "s" : ""}
                                </Badge>
                              )}
                              {step.metadata.warningCount > 0 && (
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                                  {step.metadata.warningCount} Warning{step.metadata.warningCount !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          )}
                          {step.proofOfDeliveryUrl && (
                            <div className="mt-4">
                              <a href={step.proofOfDeliveryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50" onClick={e => e.stopPropagation()}>
                                <FileText className="w-4 h-4" />Open POD PDF
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && hasLines && (
                      <div className="px-6 pb-6">
                        <div className="border-t border-gray-300 pt-4">
                          <h4 className="mb-3">Order Lines</h4>
                          <div className="space-y-3">
                            {step.lines.map((line: OrderLine) => (
                              <div key={line.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h5 className="text-gray-900">{line.itemName}</h5>
                                      <Badge variant="outline" className={getLineStatusColor(line.status)}>{line.status}</Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div><span className="text-gray-500">Item:</span><span className="ml-2 text-gray-900">{line.itemCode}</span></div>
                                      <div><span className="text-gray-500">Qty:</span><span className="ml-2 text-gray-900">{line.quantity}</span></div>
                                      <div><span className="text-gray-500">Updated:</span><span className="ml-2 text-gray-900">{line.lastUpdated}</span></div>
                                    </div>
                                    {line.errorMessage && (
                                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                                        <div className="text-sm text-red-700">{line.errorMessage}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              );
            };

            return (
              <>
                {preSplitSteps.map((step, idx) => renderStep(step, idx, preSplitSteps.length))}
                
                {branchGroups.length > 0 && (
                  <Card className="bg-indigo-50 border-indigo-300 border-2 shadow-md">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Package className="w-6 h-6 text-indigo-600" />
                        <h3 className="text-xl font-bold text-indigo-700">Order Split ({branchGroups.length} branches)</h3>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {branchGroups.map((branch, branchIdx) => {
                          const programName = branch.programName || `Branch ${branchIdx + 1}`;
                          return (
                            <div key={branchIdx} className="bg-white rounded-lg border-2 border-indigo-200 p-4 min-w-[300px] flex-1">
                              <div className="text-sm font-semibold text-indigo-700 mb-3">{programName}</div>
                              <div className="space-y-3">
                                {branch.steps.map((step, stepIdx) => (
                                  <div key={step.id} className="border rounded-lg overflow-hidden">
                                    {renderStep(step, stepIdx, branch.steps.length, true)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}
                
                {postSplitSteps.map((step, idx) => renderStep(step, idx, postSplitSteps.length))}
              </>
            );
          })()}
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="text-indigo-900 mb-1">
                How to Read This Page
              </h3>
              <p className="text-sm text-indigo-700">
                Each card represents a processing interface that your order goes
                through. Click on cards with order lines to expand and see
                detailed status for each line item. The cards are connected
                vertically to show the flow of your order. Color coding indicates
                status: green for completed, blue for in progress, amber for
                warnings, red for errors, and gray for pending steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
