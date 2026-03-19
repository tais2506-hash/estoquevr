import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

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
  value: string; // final selected location id (single mode)
  onValueChange: (locationId: string) => void;
  required?: boolean;
  /** Enable multi-select at the deepest level (e.g. multiple apartments) */
  multiSelect?: boolean;
  /** Selected location IDs when multiSelect is true */
  multiValue?: string[];
  /** Callback when multiSelect values change */
  onMultiValueChange?: (locationIds: string[]) => void;
}

const CascadingLocationSelect = ({
  locations,
  value,
  onValueChange,
  required,
  multiSelect,
  multiValue = [],
  onMultiValueChange,
}: CascadingLocationSelectProps) => {
  // In multi-select mode, derive the hierarchy from the first selected value or the intermediate value
  const referenceValue = multiSelect ? (multiValue[0] || value) : value;

  // Build hierarchy state from current value
  const hierarchy = useMemo(() => {
    if (!referenceValue) return {};
    const map: Record<string, string> = {};
    let current = locations.find((l) => l.id === referenceValue);
    while (current) {
      map[current.type] = current.id;
      current = current.parent_id
        ? locations.find((l) => l.id === current!.parent_id)
        : undefined;
    }
    return map;
  }, [referenceValue, locations]);

  // Determine which levels exist in this obra
  const availableTypes = useMemo(() => {
    const types = new Set(locations.map((l) => l.type));
    return TYPE_ORDER.filter((t) => types.has(t));
  }, [locations]);

  // For each level, compute available options based on parent selection
  const getOptionsForType = (type: string, typeIndex: number) => {
    if (typeIndex === 0) {
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

  // Check if a type is the deepest level that has children
  const isDeepestWithOptions = (typeIndex: number) => {
    if (typeIndex >= availableTypes.length - 1) return true;
    const nextType = availableTypes[typeIndex + 1];
    const currentId = hierarchy[availableTypes[typeIndex]];
    if (!currentId) return true;
    const children = locations.filter(l => l.type === nextType && l.parent_id === currentId);
    return children.length === 0;
  };

  const handleChange = (type: string, typeIndex: number, newId: string) => {
    if (!newId) {
      if (typeIndex > 0) {
        const parentType = availableTypes[typeIndex - 1];
        onValueChange(hierarchy[parentType] || "");
      } else {
        onValueChange("");
      }
      if (multiSelect) onMultiValueChange?.([]);
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
        // Intermediate selection, clear multi-values
        onValueChange(newId);
        if (multiSelect) onMultiValueChange?.([]);
        return;
      }
    }

    // Deepest level
    if (multiSelect) {
      // Add to multi-value instead of replacing
      if (!multiValue.includes(newId)) {
        onMultiValueChange?.([...multiValue, newId]);
      }
      // Keep value as intermediate parent for hierarchy
      onValueChange(newId);
    } else {
      onValueChange(newId);
    }
  };

  const removeMultiValue = (id: string) => {
    const newValues = multiValue.filter(v => v !== id);
    onMultiValueChange?.(newValues);
    if (newValues.length > 0) {
      onValueChange(newValues[0]);
    } else {
      // Reset to parent level
      const loc = locations.find(l => l.id === id);
      if (loc?.parent_id) {
        onValueChange(loc.parent_id);
      } else {
        onValueChange("");
      }
    }
  };

  const getLocationName = (id: string) => {
    return locations.find(l => l.id === id)?.name || "";
  };

  if (availableTypes.length === 0) return null;

  return (
    <div className="space-y-3">
      {availableTypes.map((type, idx) => {
        const options = getOptionsForType(type, idx);
        const currentValue = hierarchy[type] || "";
        const isDeepest = isDeepestWithOptions(idx);
        const useMulti = multiSelect && isDeepest && currentValue;

        // Don't show level if no options (parent not selected yet)
        if (idx > 0 && options.length === 0) return null;

        // In multi-select mode at deepest level, show the select + badges
        if (useMulti && multiValue.length > 0) {
          // Filter out already-selected options for the dropdown
          const remainingOptions = options.filter(o => !multiValue.includes(o.value));

          return (
            <div key={type} className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {TYPE_LABELS[type] || type}
                {required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {multiValue.map(id => (
                  <Badge key={id} variant="secondary" className="gap-1 pr-1">
                    {getLocationName(id)}
                    <button
                      type="button"
                      onClick={() => removeMultiValue(id)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {remainingOptions.length > 0 && (
                <SearchableSelect
                  options={remainingOptions}
                  value=""
                  onValueChange={(v) => handleChange(type, idx, v)}
                  placeholder={`Adicionar ${(TYPE_LABELS[type] || type).toLowerCase()}...`}
                  searchPlaceholder="Buscar..."
                  emptyMessage="Nenhum encontrado."
                />
              )}
            </div>
          );
        }

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
