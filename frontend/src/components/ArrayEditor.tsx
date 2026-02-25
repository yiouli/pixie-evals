import React, { useMemo } from "react";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  type ButtonProps,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

/** Props passed to the render function for each array item. */
export type ArrayItemRendererProps<T> = {
  value: T;
  index: number;
  onChange: (next: T) => void;
  onDelete: () => void;
};

export interface ArrayEditorProps<T> {
  /** Current array value (controlled). */
  value: T[];
  /** Called whenever the array changes. */
  onChange: (next: T[]) => void;
  /** Render function for each item's content. */
  renderItem: (props: ArrayItemRendererProps<T>) => React.ReactNode;
  /** Factory to create a new blank item when "Add" is clicked. */
  createItem?: () => T;
  /** Stable key extractor (falls back to array index). */
  getItemId?: (item: T, index: number) => string;
  /** Label for the default add button. */
  addLabel?: string;
  /** Extra props forwarded to the default add button. */
  addButtonProps?: ButtonProps;
  /** Replace the default add button with custom controls. */
  renderAddControls?: (addItem: (item?: T) => void) => React.ReactNode;
}

/**
 * Generic sortable list editor with drag-and-drop reordering.
 *
 * Ported from pixie-ui's ArrayEditor. Renders each item in a card
 * with a drag handle and delete button. The caller provides the item
 * content via `renderItem`.
 */
export function ArrayEditor<T>({
  value,
  onChange,
  renderItem,
  createItem,
  getItemId,
  addLabel = "Add item",
  addButtonProps,
  renderAddControls,
}: ArrayEditorProps<T>) {
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor),
  );

  const itemIds = useMemo(
    () => value.map((item, idx) => getItemId?.(item, idx) ?? `${idx}`),
    [value, getItemId],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const oldIndex = itemIds.findIndex((id) => id === active.id);
    const newIndex = itemIds.findIndex((id) => id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const handleItemChange = (index: number, nextValue: T) => {
    const next = [...value];
    next[index] = nextValue;
    onChange(next);
  };

  const handleDelete = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  const addItem = (item?: T) => {
    const nextItem =
      item !== undefined
        ? item
        : createItem
          ? createItem()
          : (null as unknown as T);
    onChange([...value, nextItem]);
  };

  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5}>
            {value.map((item, index) => (
              <SortableItemCard
                key={itemIds[index]}
                id={itemIds[index] ?? `${index}`}
                onDelete={() => handleDelete(index)}
              >
                {renderItem({
                  value: item,
                  index,
                  onChange: (next) => handleItemChange(index, next),
                  onDelete: () => handleDelete(index),
                })}
              </SortableItemCard>
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
      <Box>
        {renderAddControls ? (
          renderAddControls(addItem)
        ) : (
          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => addItem()}
            sx={{ textTransform: "none" }}
            {...addButtonProps}
          >
            {addLabel}
          </Button>
        )}
      </Box>
    </Stack>
  );
}

interface SortableItemCardProps {
  id: string;
  onDelete: () => void;
  children: React.ReactNode;
}

function SortableItemCard({ id, onDelete, children }: SortableItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        p: 1.5,
        border: "2px solid",
        borderColor: "divider",
        borderRadius: 2,
        opacity: isDragging ? 0.85 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ width: "100%" }}
      >
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          aria-label="Drag item"
          sx={{ mt: 0.25 }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
        <IconButton
          size="small"
          color="error"
          onClick={onDelete}
          aria-label="Delete item"
          sx={{ mt: 0.25 }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
}
