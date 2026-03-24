"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

interface NewGoalFormProps {
  defaultOpen?: boolean;
}

export function NewGoalForm({ defaultOpen }: NewGoalFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("learning-plan");
  const [timeline, setTimeline] = useState("");
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [timeCommitment, setTimeCommitment] = useState("");

  async function handleCreate(generatePlan: boolean) {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setLoading(true);
    try {
      // Get default workspace
      const wsRes = await fetch("/api/goals");
      const goals = await wsRes.json();
      let workspaceId: string;

      if (Array.isArray(goals) && goals.length > 0) {
        workspaceId = goals[0].workspace_id;
      } else {
        // Use the seeded workspace
        workspaceId = "a0000000-0000-0000-0000-000000000001";
      }

      const constraints: Record<string, unknown> = {};
      if (timeline) constraints.timeline = timeline;
      if (timeCommitment) constraints.time_commitment = timeCommitment;
      constraints.skill_level = skillLevel;

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          title: title.trim(),
          description: description.trim() || null,
          domain_template: template,
          constraints,
        }),
      });

      if (!res.ok) throw new Error("Failed to create goal");
      const goal = await res.json();
      toast.success("Goal created");

      if (generatePlan) {
        toast.info("Generating plan... This may take a moment.");
        const planRes = await fetch("/api/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal_id: goal.id,
            goal_title: goal.title,
            goal_description: goal.description ?? "",
            workspace_id: goal.workspace_id,
            template: goal.domain_template,
          }),
        });
        if (planRes.ok) {
          toast.success("Plan generated!");
          router.push(`/plan/${goal.id}`);
        } else {
          toast.error("Plan generation failed. You can retry from the plan view.");
          router.push(`/plan/${goal.id}`);
        }
      } else {
        router.refresh();
      }

      setOpen(false);
      setTitle("");
      setDescription("");
      setTimeline("");
      setTimeCommitment("");
    } catch {
      toast.error("Failed to create goal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon className="h-4 w-4" />
        New Goal
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a New Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Learn Rust in 6 weeks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you want to achieve, your constraints, and any context..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v ?? "learning-plan")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learning-plan">Learning Plan</SelectItem>
                <SelectItem value="generic">Generic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {template === "learning-plan" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Input
                    id="timeline"
                    placeholder="6 weeks"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="commitment">Time / week</Label>
                  <Input
                    id="commitment"
                    placeholder="10 hours"
                    value={timeCommitment}
                    onChange={(e) => setTimeCommitment(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Skill Level</Label>
                <Select value={skillLevel} onValueChange={(v) => setSkillLevel(v ?? "beginner")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleCreate(false)}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Create Draft
            </Button>
            <Button
              onClick={() => handleCreate(true)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create & Generate Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
