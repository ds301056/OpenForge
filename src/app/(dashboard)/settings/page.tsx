"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircleIcon,
  XCircleIcon,
  CpuIcon,
  FileJsonIcon,
} from "lucide-react";

interface TemplateInfo {
  name: string;
  slug: string;
  description: string;
}

export default function SettingsPage() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  useEffect(() => {
    // Fetch templates
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(() => {});

    // Check Ollama
    const ollamaUrl =
      process.env.NEXT_PUBLIC_OLLAMA_URL ?? "http://localhost:11434";
    fetch(`${ollamaUrl}/api/tags`)
      .then((r) => r.json())
      .then((data) => {
        setOllamaStatus("connected");
        setOllamaModels(
          (data.models ?? []).map(
            (m: Record<string, unknown>) => String(m.name ?? m.model)
          )
        );
      })
      .catch(() => {
        setOllamaStatus("disconnected");
      });
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your workspace and inference providers
        </p>
      </div>

      <Tabs defaultValue="inference">
        <TabsList>
          <TabsTrigger value="inference">Inference</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        {/* Inference Tab */}
        <TabsContent value="inference" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CpuIcon className="h-4 w-4" />
                Ollama (Local Inference)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {ollamaStatus === "checking" ? (
                  <Badge variant="outline">Checking...</Badge>
                ) : ollamaStatus === "connected" ? (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-700"
                  >
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-red-100 text-red-700"
                  >
                    <XCircleIcon className="h-3 w-3 mr-1" />
                    Not connected
                  </Badge>
                )}
              </div>
              {ollamaModels.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Installed Models
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ollamaModels.map((model) => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {ollamaStatus === "disconnected" && (
                <p className="text-xs text-muted-foreground">
                  Ollama is not running. Start it with{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    ollama serve
                  </code>{" "}
                  to enable local inference.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Cloud Review Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Anthropic (Claude)</span>
                  <Badge variant="outline" className="text-xs">
                    Configure via ANTHROPIC_API_KEY
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Google (Gemini)</span>
                  <Badge variant="outline" className="text-xs">
                    Configure via GOOGLE_AI_API_KEY
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>OpenAI</span>
                  <Badge variant="outline" className="text-xs">
                    Configure via OPENAI_API_KEY
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Cloud providers are used for optional plan review only. All plan
                generation runs locally via Ollama.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {templates.map((tmpl) => (
            <Card key={tmpl.slug}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileJsonIcon className="h-4 w-4" />
                    {tmpl.name}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {tmpl.slug}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {tmpl.description}
                </p>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Loading templates...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Default Workspace (multi-workspace support coming in v1.0)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">About</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>OpenForge v0.1.0</p>
              <p>
                An open-source AI planning engine that turns vague goals into
                adaptive, explainable execution plans.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
