// =================================================
//                      ATOMS
// =================================================
export interface AccordionProps {
  type?: "single" | "multiple";
  className?: string;
  items: { value: string; trigger: React.ReactNode; content: React.ReactNode }[];
}

export interface AlertProps {
  title: string;
  description: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
}

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "link";
}

export interface EmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  iconVariant?: "default" | "icon";
}

export interface DrawerProps {
  title: string;
  close?: React.ReactNode;
  footer?: React.ReactNode;
  content?: React.ReactNode;
  children: React.ReactNode;
  direction?: "top" | "bottom" | "left" | "right";
  description?: string;
}

export interface TableProps<TData, TValue> {
  columns: import("@tanstack/react-table").ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
}

export interface TokenIconProps {
  token: string;
  iconUrl?: string;
  size?: number;
}

export interface SelectProps {
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  items: { value: string; label: string; href?: string }[];
}

// =================================================
//                     MOLECULES
// =================================================

// =================================================
//                     ORGANISMS
// =================================================

// =================================================
//                      LAYOUTS
// =================================================
export interface SidebarProps {
  children: React.ReactNode;
}

// =================================================
//                     TEMPLATES
// =================================================

// =================================================
//                       PAGES
// =================================================

// =================================================
//                     FUNCTIONS
// =================================================
