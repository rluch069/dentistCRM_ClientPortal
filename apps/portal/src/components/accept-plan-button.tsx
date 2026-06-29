"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@dentalos/ui";
import { acceptPlanAction } from "@/app/records/actions";

export function AcceptPlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div className="text-right">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await acceptPlanAction(planId);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Accepting…" : "Accept & e-sign"}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
