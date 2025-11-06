"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, PlusCircle } from "lucide-react";
import { ServiceForm, ServiceFormNormalizedValues } from "../_components/ServiceForm";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export default function CreateServicePage() {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);

  const handleSubmit = async (values: ServiceFormNormalizedValues) => {
    try {
      setMessage(null);

      const response = await fetch("/api/services", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create service");
      }

      setMessage({ type: "success", text: result.message || "Service created successfully" });
      router.push("/services");
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to create service" });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Service</h1>
          <p className="text-muted-foreground">
            Define a new inspection service that your team can schedule and manage.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/services")}>
          Back to Services
        </Button>
      </div>

      {message && (
        <Card
          className={
            message.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          <CardContent className="flex items-start gap-3 p-4">
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className="text-sm text-muted-foreground">{message.text}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setMessage(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            New Service Details
          </CardTitle>
          <CardDescription>Fill out the information below to create your service.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceForm
            submitLabel="Create Service"
            onSubmit={handleSubmit}
            onCancel={() => router.push("/services")}
          />
        </CardContent>
      </Card>
    </div>
  );
}


