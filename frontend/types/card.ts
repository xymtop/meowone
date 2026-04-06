export interface BaseCard {
  id: string;
  type: "info" | "action" | "form";
  title: string;
  icon?: string;
  status?: "loading" | "success" | "error";
}

export interface InfoCard extends BaseCard {
  type: "info";
  fields: Array<{ label: string; value: string }>;
}

export interface ActionCard extends BaseCard {
  type: "action";
  fields: Array<{ label: string; value: string }>;
  actions: Array<{
    id: string;
    label: string;
    style: "primary" | "secondary" | "danger";
    payload: Record<string, unknown>;
  }>;
}

export interface FormField {
  name: string;
  label: string;
  type: "text" | "date" | "select" | "number";
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}

export interface FormCard extends BaseCard {
  type: "form";
  fields: FormField[];
  submitLabel: string;
}

export type Card = InfoCard | ActionCard | FormCard;
