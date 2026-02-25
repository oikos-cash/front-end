// =================================================
//                      ATOMS
// =================================================
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

// =================================================
//                     TEMPLATES
// =================================================

// =================================================
//                       PAGES
// =================================================

// =================================================
//                     FUNCTIONS
// =================================================
