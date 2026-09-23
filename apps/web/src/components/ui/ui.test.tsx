import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button,
  Badge,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Skeleton,
  MetricCardSkeleton,
  TableSkeleton,
  BenchCardSkeleton,
  FormSkeleton,
} from "./index";

describe("TASK-049: Shared Metrological UI Library", () => {
  describe("Button Component", () => {
    test("enforces minimum 48px touch target on default button", () => {
      const html = renderToStaticMarkup(<Button>Test Action</Button>);
      assert.ok(html.includes("min-h-[48px]"), "Must have min-h-[48px] for touch target");
      assert.ok(html.includes("rounded-2xl"), "Must have Twitter theme pill radius rounded-2xl");
    });

    test("enforces minimum 48px x 48px bounding box on icon buttons", () => {
      const html = renderToStaticMarkup(
        <Button size="icon" aria-label="Settings">
          <span>⚙</span>
        </Button>
      );
      assert.ok(html.includes("min-h-[48px]"), "Icon button must have min-h-[48px]");
      assert.ok(html.includes("min-w-[48px]"), "Icon button must have min-w-[48px]");
    });

    test("renders primary and destructive variant color tokens", () => {
      const primaryHtml = renderToStaticMarkup(<Button variant="default">Save</Button>);
      assert.ok(primaryHtml.includes("bg-primary"));
      assert.ok(primaryHtml.includes("text-primary-foreground"));

      const destructiveHtml = renderToStaticMarkup(<Button variant="destructive">Reject</Button>);
      assert.ok(destructiveHtml.includes("bg-destructive"));
    });

    test("handles disabled and loading states cleanly", () => {
      const disabledHtml = renderToStaticMarkup(<Button disabled>Disabled</Button>);
      assert.ok(disabledHtml.includes("disabled"));
      assert.ok(disabledHtml.includes("disabled:opacity-50"));

      const loadingHtml = renderToStaticMarkup(<Button isLoading>Submitting</Button>);
      assert.ok(loadingHtml.includes("disabled"));
      assert.ok(loadingHtml.includes("animate-spin"));
    });
  });

  describe("Badge Component & Metrological Compliance States", () => {
    test("renders PASS compliance state with emerald badge and checkmark", () => {
      const html = renderToStaticMarkup(<Badge variant="pass">PASS</Badge>);
      assert.ok(html.includes("bg-emerald-500/10"));
      assert.ok(html.includes("text-emerald-600"));
      assert.ok(html.includes("<svg")); // Phosphor CheckCircle icon
      assert.ok(html.includes("PASS"));
    });

    test("renders FAIL compliance state with destructive ember red badge", () => {
      const html = renderToStaticMarkup(<Badge variant="fail">FAIL</Badge>);
      assert.ok(html.includes("bg-destructive/10"));
      assert.ok(html.includes("text-destructive"));
      assert.ok(html.includes("<svg")); // Phosphor XCircle icon
    });

    test("renders WARNING compliance state for NABL 129 out-of-spec conditions", () => {
      const html = renderToStaticMarkup(<Badge variant="warning">NABL 129 WARN</Badge>);
      assert.ok(html.includes("bg-amber-500/10"));
      assert.ok(html.includes("text-amber-600"));
      assert.ok(html.includes("<svg")); // Phosphor Warning icon
    });

    test("renders IN_PROGRESS and PENDING review badges", () => {
      const inProgressHtml = renderToStaticMarkup(<Badge variant="in_progress">RUNNING</Badge>);
      assert.ok(inProgressHtml.includes("bg-primary/10"));

      const pendingHtml = renderToStaticMarkup(<Badge variant="pending">INSPECTION</Badge>);
      assert.ok(pendingHtml.includes("bg-purple-500/10"));
    });
  });

  describe("Input Component", () => {
    test("renders touch-friendly input with min-h-[48px]", () => {
      const html = renderToStaticMarkup(<Input placeholder="Scale serial number" />);
      assert.ok(html.includes("min-h-[48px]"));
      assert.ok(html.includes("rounded-2xl"));
    });

    test("enforces inputMode='decimal' and font-mono in numeric metrology mode", () => {
      const html = renderToStaticMarkup(
        <Input numeric unit="kg" placeholder="0.0000" />
      );
      assert.ok(html.toLowerCase().includes('inputmode="decimal"'));
      assert.ok(html.includes("font-mono"));
      assert.ok(html.includes("tabular-nums"));
      assert.ok(html.includes("kg")); // Unit adornment
    });

    test("renders error border styling when hasError is true", () => {
      const html = renderToStaticMarkup(<Input hasError placeholder="Invalid input" />);
      assert.ok(html.includes("border-destructive"));
    });
  });

  describe("Card Compound Components", () => {
    test("renders card with rounded-xl geometry and standard slots", () => {
      const html = renderToStaticMarkup(
        <Card>
          <CardHeader>
            <CardTitle>Session TS-2026-0089</CardTitle>
            <CardDescription>OIML R-76 Weighing Form</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Observed load point data</p>
          </CardContent>
          <CardFooter>
            <Button>Next Step</Button>
          </CardFooter>
        </Card>
      );
      assert.ok(html.includes("rounded-xl"));
      assert.ok(html.includes("Session TS-2026-0089"));
      assert.ok(html.includes("OIML R-76 Weighing Form"));
    });
  });

  describe("Zero-Spinner Skeleton Loaders", () => {
    test("renders base skeleton primitive with animate-pulse", () => {
      const html = renderToStaticMarkup(<Skeleton className="h-6 w-24" />);
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("bg-muted/60"));
      assert.ok(html.includes("rounded-2xl"));
    });

    test("renders MetricCardSkeleton preserving 112px height", () => {
      const html = renderToStaticMarkup(<MetricCardSkeleton />);
      assert.ok(html.includes("h-28")); // 112px fixed height
      assert.ok(html.includes("rounded-xl"));
      assert.ok(html.includes("animate-pulse"));
    });

    test("renders TableSkeleton and BenchCardSkeleton with accurate geometry", () => {
      const tableHtml = renderToStaticMarkup(<TableSkeleton rows={3} columns={3} />);
      assert.ok(tableHtml.includes("space-y-2"));

      const benchHtml = renderToStaticMarkup(<BenchCardSkeleton />);
      assert.ok(benchHtml.includes("grid grid-cols-2"));
      assert.ok(benchHtml.includes("rounded-xl"));
    });

    test("renders FormSkeleton matching input shapes", () => {
      const formHtml = renderToStaticMarkup(<FormSkeleton fields={2} />);
      assert.ok(formHtml.includes("space-y-4"));
    });
  });
});
