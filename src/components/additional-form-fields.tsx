import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ListChecks, Plus, TextCursorInput, Trash2, X } from 'lucide-react-native';

import { Surface } from '@/components/inventory-ui';
import { BRAND, TYPE } from '@/constants/brand';

export type AdditionalFormFieldType = 'CHECKBOX' | 'TEXT';

export interface AdditionalFormField {
  id: string;
  type: AdditionalFormFieldType;
  label: string;
  value: boolean | string;
}

export interface AdditionalFormFieldSubmission {
  type: AdditionalFormFieldType;
  label: string;
  value: boolean | string;
}

let fieldSequence = 0;

function createFieldId() {
  fieldSequence += 1;
  return `additional-field-${Date.now()}-${fieldSequence}`;
}

export function toAdditionalFieldSubmissions(fields: AdditionalFormField[]): AdditionalFormFieldSubmission[] {
  return fields.map(({ type, label, value }) => ({ type, label: label.trim(), value }));
}

export function mergeAdditionalFieldsIntoNotes(notes: string, fields: AdditionalFormField[]) {
  const base = notes.trim();
  if (!fields.length) return base || null;
  const details = fields.map((field) => (
    field.type === 'CHECKBOX'
      ? `${field.value ? '[x]' : '[ ]'} ${field.label.trim()}`
      : `${field.label.trim()}: ${String(field.value).trim() || '—'}`
  ));
  return [base, `Package checks & details:\n${details.join('\n')}`].filter(Boolean).join('\n\n');
}

interface AdditionalFormFieldsProps {
  fields: AdditionalFormField[];
  onChange: (fields: AdditionalFormField[]) => void;
  title?: string;
  hint?: string;
  maxFields?: number;
}

export function AdditionalFormFields({
  fields,
  onChange,
  title = 'Package checks & details',
  hint = 'Add a checklist item or input when this package needs something different.',
  maxFields = 10,
}: AdditionalFormFieldsProps) {
  const [adding, setAdding] = useState(false);
  const [draftType, setDraftType] = useState<AdditionalFormFieldType>('CHECKBOX');
  const [draftLabel, setDraftLabel] = useState('');

  function closeComposer() {
    setAdding(false);
    setDraftLabel('');
    setDraftType('CHECKBOX');
  }

  function addField() {
    const label = draftLabel.trim();
    if (!label || fields.length >= maxFields) return;
    onChange([...fields, { id: createFieldId(), type: draftType, label, value: draftType === 'CHECKBOX' ? false : '' }]);
    closeComposer();
  }

  function updateField(id: string, value: boolean | string) {
    onChange(fields.map((field) => field.id === id ? { ...field, value } : field));
  }

  function removeField(id: string) {
    onChange(fields.filter((field) => field.id !== id));
  }

  return (
    <Surface style={styles.surface}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
        {!adding && fields.length < maxFields ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Add package field" onPress={() => setAdding(true)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Plus size={18} color={BRAND.red} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      {fields.length ? <View style={styles.fieldList}>
        {fields.map((field) => (
          <View key={field.id} style={styles.fieldCard}>
            {field.type === 'CHECKBOX' ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(field.value) }}
                onPress={() => updateField(field.id, !field.value)}
                style={styles.checkRow}>
                <View style={[styles.checkbox, field.value && styles.checkboxActive]}>
                  {field.value ? <Check size={17} color={BRAND.white} strokeWidth={2.8} /> : null}
                </View>
                <Text style={styles.fieldLabel}>{field.label}</Text>
              </Pressable>
            ) : (
              <View style={styles.textField}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  value={String(field.value)}
                  onChangeText={(value) => updateField(field.id, value)}
                  placeholder="Enter value"
                  placeholderTextColor={BRAND.muted}
                  maxLength={240}
                  style={styles.input}
                />
              </View>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${field.label}`} hitSlop={8} onPress={() => removeField(field.id)} style={styles.removeButton}>
              <Trash2 size={17} color={BRAND.muted} />
            </Pressable>
          </View>
        ))}
      </View> : <View style={styles.empty}><ListChecks size={20} color={BRAND.muted} /><Text style={styles.emptyText}>No extra package fields</Text></View>}

      {adding ? (
        <View style={styles.composer}>
          <View style={styles.typeRow}>
            <Pressable onPress={() => setDraftType('CHECKBOX')} style={[styles.typeButton, draftType === 'CHECKBOX' && styles.typeButtonActive]}>
              <ListChecks size={17} color={draftType === 'CHECKBOX' ? BRAND.violet : BRAND.inkSoft} />
              <Text style={[styles.typeText, draftType === 'CHECKBOX' && styles.typeTextActive]}>Checklist</Text>
            </Pressable>
            <Pressable onPress={() => setDraftType('TEXT')} style={[styles.typeButton, draftType === 'TEXT' && styles.typeButtonActive]}>
              <TextCursorInput size={17} color={draftType === 'TEXT' ? BRAND.violet : BRAND.inkSoft} />
              <Text style={[styles.typeText, draftType === 'TEXT' && styles.typeTextActive]}>Input field</Text>
            </Pressable>
          </View>
          <TextInput
            autoFocus
            value={draftLabel}
            onChangeText={setDraftLabel}
            onSubmitEditing={addField}
            placeholder={draftType === 'CHECKBOX' ? 'e.g. Security seal intact' : 'e.g. Carton dimensions'}
            placeholderTextColor={BRAND.muted}
            maxLength={80}
            returnKeyType="done"
            style={styles.labelInput}
          />
          <View style={styles.composerActions}>
            <Pressable accessibilityRole="button" onPress={closeComposer} style={styles.cancelButton}>
              <X size={17} color={BRAND.inkSoft} />
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!draftLabel.trim()} onPress={addField} style={[styles.saveButton, !draftLabel.trim() && styles.disabled]}>
              <Plus size={17} color={BRAND.white} />
              <Text style={styles.saveText}>Add field</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {fields.length >= maxFields ? <Text style={styles.limit}>Maximum of {maxFields} additional fields reached.</Text> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: { marginTop: 12, marginBottom: 12, padding: 15 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headingCopy: { flex: 1 },
  title: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 17, fontWeight: '700' },
  hint: { marginTop: 4, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, lineHeight: 17 },
  addButton: { minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: `${BRAND.red}45`, backgroundColor: BRAND.redSoft, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11 },
  addButtonText: { color: BRAND.red, fontFamily: TYPE.body, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  empty: { marginTop: 14, minHeight: 48, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: BRAND.line, backgroundColor: BRAND.canvas, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12, fontWeight: '600' },
  fieldList: { marginTop: 14, gap: 9 },
  fieldCard: { minHeight: 62, borderRadius: 13, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.canvas, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 8 },
  checkRow: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11 },
  checkbox: { width: 27, height: 27, borderRadius: 7, borderWidth: 1.5, borderColor: BRAND.line, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: BRAND.green, backgroundColor: BRAND.green },
  fieldLabel: { flex: 1, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  textField: { flex: 1, paddingVertical: 10 },
  input: { height: 40, marginTop: 7, borderRadius: 10, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, paddingHorizontal: 11 },
  removeButton: { width: 39, height: 44, alignItems: 'center', justifyContent: 'center' },
  composer: { marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: `${BRAND.violet}55`, backgroundColor: BRAND.violetSoft, padding: 12 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeButton: { flex: 1, minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeButtonActive: { borderColor: BRAND.violet },
  typeText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, fontWeight: '600' },
  typeTextActive: { color: BRAND.violet, fontWeight: '700' },
  labelInput: { height: 46, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, paddingHorizontal: 12 },
  composerActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { minHeight: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11 },
  cancelText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, fontWeight: '700' },
  saveButton: { minHeight: 40, borderRadius: 10, backgroundColor: BRAND.violet, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13 },
  saveText: { color: BRAND.white, fontFamily: TYPE.body, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  limit: { marginTop: 10, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11, textAlign: 'center' },
});
