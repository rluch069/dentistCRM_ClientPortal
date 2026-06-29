"use client";

import { useActionState, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@dentalos/ui";
import { slugify } from "@dentalos/core";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { createClinicAction, type OnboardState } from "@/app/onboarding/actions";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(createClinicAction, {});
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  if (state.ok && state.slug) {
    const base = `http://${state.slug}.localhost:3000`;
    return (
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h2 className="text-xl font-semibold">Your clinic is ready!</h2>
          <p className="text-sm text-muted-foreground">
            We provisioned an isolated database and seeded your schedule. Sign in to your staff workspace:
          </p>
          <a href={`${base}/login`}>
            <Button size="lg">
              Open {state.slug} staff app <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <p className="text-xs text-muted-foreground">
            Patient portal: <a className="text-primary hover:underline" href={`http://${state.slug}.localhost:3100`}>{state.slug}.localhost:3100</a>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your clinic</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clinicName">Clinic name</Label>
            <Input
              id="clinicName"
              name="clinicName"
              required
              placeholder="Smile Dental Clinic"
              onChange={(e) => {
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Workspace address</Label>
            <div className="flex items-center gap-2">
              <Input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="smile-dental"
              />
              <span className="whitespace-nowrap text-sm text-muted-foreground">.localhost:3000</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ownerName">Your name</Label>
              <Input id="ownerName" name="ownerName" required placeholder="Dr. Anita Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locale">Default language</Label>
              <Select id="locale" name="locale" defaultValue="en">
                <option value="en">English</option>
                <option value="fr">Français</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ownerEmail">Email</Label>
            <Input id="ownerEmail" name="ownerEmail" type="email" required placeholder="you@clinic.mu" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ownerPassword">Password</Label>
              <Input id="ownerPassword" name="ownerPassword" type="password" required minLength={8} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Clinic phone (optional)</Label>
              <Input id="phone" name="phone" placeholder="5xxx xxxx" />
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Provisioning…" : "Create clinic"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
