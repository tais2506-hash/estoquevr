import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";

interface LocationRow {
  id: string;
  obra_id: string;
  parent_id: string | null;
  name: string;
  type: string;
  status: string;
  deleted_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  torre: "Torre / Bloco",
  pavimento: "Pavimento",
  unidade: "Unidade",
  ambiente: "Ambiente",
};

const TYPE_ORDER = ["torre", "pavimento", "unidade", "ambiente"];

interface CascadingLocationSelectProps {
  locations: LocationRow[];
  value: string; // final selected location id
  onValueChange: (locationId: string) => void;
  required?: boolean;
}

const CascadingLocationSelect = ({
  locations,
  value,
  onValueChange,
  required,
}: CascadingLocationSelectProps) => {
  // Build hierarchy state from current value
  const hierarchy = useMemo(() => {
    if (!value) return {};
    const map: Record<string, string> = {};
    let current = locations.find((l) => l.id === value);
    while (current) {
      map[current.type] = current.id;
      current = current.parent_id
        ? locations.find((l) => l.id === current!.parent_id)
        : undefined;
    }
    return map;
  }, [value, locations]);

  // Determine which levels exist in this obra
  const availableTypes = useMemo(() => {
    const types = new Set(locations.map((l) => l.type));
    return TYPE_ORDER.filter((t) => types.has(t));
  }, [locations]);

  // For each level, compute available options based on parent selection
  const getOptionsForType = (type: string, typeIndex: number) => {
    if (typeIndex === 0) {
      // Top level: no parent
      return locations
        .filter((l) => l.type === type && !l.parent_id)
        .map((l) => ({ value: l.id, label: l.name }));
    }
    const parentType = availableTypes[typeIndex - 1];
    const parentId = hierarchy[parentType];
    if (!parentId) return [];
    return locations
      .filter((l) => l.type === type && l.parent_id === parentId)
      .map((l) => ({ value: l.id, label: l.name }));
  };

  const handleChange = (type: string, typeIndex: number, newId: string) => {
    // When a level changes, clear all children and set this as value
    // But if there are deeper levels with options, don't set final value yet
    // The final value is always the deepest selected level
    if (!newId) {
      // Find the parent level's id as the new value
      if (typeIndex > 0) {
        const parentType = availableTypes[typeIndex - 1];
        onValueChange(hierarchy[parentType] || "");
      } else {
        onValueChange("");
      }
      return;
    }

    // Check if there are children for the next level
    const nextTypeIndex = typeIndex + 1;
    if (nextTypeIndex < availableTypes.length) {
      const nextType = availableTypes[nextTypeIndex];
      const children = locations.filter(
        (l) => l.type === nextType && l.parent_id === newId
      );
      if (children.length > 0) {
        // Set this as current value (intermediate), user needs to pick deeper
        onValueChange(newId);
        return;
      }
    }
    // Deepest level or no children
    onValueChange(newId);
  };

  if (availableTypes.length === 0) return null;

  return (
    <div className="space-y-3">
      {availableTypes.map((type, idx) => {
        const options = getOptionsForType(type, idx);
        const currentValue = hierarchy[type] || "";

        // Don't show level if no options (parent not selected yet)
        if (idx > 0 && options.length === 0) return null;

        return (
          <div key={type} className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {TYPE_LABELS[type] || type}
              {required && idx === availableTypes.length - 1 && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <SearchableSelect
              options={options}
              value={currentValue}
              onValueChange={(v) => handleChange(type, idx, v)}
              placeholder={`Selecione ${(TYPE_LABELS[type] || type).toLowerCase()}...`}
              searchPlaceholder="Buscar..."
              emptyMessage="Nenhum encontrado."
            />
          </div>
        );
      })}
    </div>
  );
};

export { CascadingLocationSelect };
