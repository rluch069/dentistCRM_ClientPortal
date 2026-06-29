"use client";

import { useActionState } from "react";
import { Button, Input, Label, Spinner } from "@dentalos/ui";
import { requestOtpAction, verifyOtpAction, type RequestOtpState, type VerifyOtpState } from "@/app/login/actions";

export function PhoneLogin() {
  const [reqState, reqAction, reqPending] = useActionState<RequestOtpState, FormData>(requestOtpAction, {});
  const [verState, verAction, verPending] = useActionState<VerifyOtpState, FormData>(verifyOtpAction, {});

  if (reqState.ok && reqState.phone) {
    return (
      <form action={verAction} className="space-y-4">
        <input type="hidden" name="phone" value={reqState.phone} />
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{reqState.phone}</span>.
        </p>
        {reqState.devCode && (
          <p className="rounded-md bg-secondary p-2 text-center text-sm">
            Dev code: <span className="font-mono font-bold">{reqState.devCode}</span>
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            className="text-center text-lg tracking-[0.5em]"
            placeholder="••••••"
          />
        </div>
        {verState.error && <p className="text-sm text-destructive">{verState.error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={verPending}>
          {verPending ? (
            <>
              <Spinner /> Verifying…
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </form>
    );
  }

  return (
    <form action={reqAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="phone">Mobile number</Label>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">+230</span>
          <Input id="phone" name="phone" inputMode="numeric" required autoFocus placeholder="5xxx xxxx" />
        </div>
      </div>
      {reqState.error && <p className="text-sm text-destructive">{reqState.error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={reqPending}>
        {reqPending ? (
          <>
            <Spinner /> Sending…
          </>
        ) : (
          "Send code"
        )}
      </Button>
    </form>
  );
}
