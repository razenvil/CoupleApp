'use client';

import React, { useState, useRef } from 'react';
import { ModalDrawer } from '../common/ModalDrawer';
import { useAppStore } from '@/lib/store/app-store';
import { DocumentItem } from '@/lib/types';
import { Plus, Trash2, Check, Shield, FileText, Plane, Upload, Camera, Image as ImageIcon, X } from 'lucide-react';
import { haptic } from '@/lib/telegram';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TemplateType = 'passport' | 'international_passport' | 'snils' | 'tickets' | 'custom';

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({ isOpen, onClose }) => {
  const { couple, currentUser, addDocument } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('passport');
  const [title, setTitle] = useState('Паспорт РФ');
  const [ownerId, setOwnerId] = useState<string>(currentUser.id);
  const [notes, setNotes] = useState('');

  // Real File Upload states
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'pdf' | undefined>(undefined);
  const [fileSize, setFileSize] = useState<string>('');

  const [fields, setFields] = useState<Array<{ label: string; value: string; copyable: boolean; masked: boolean }>>([
    { label: 'ФИО', value: '', copyable: true, masked: false },
    { label: 'Серия и номер', value: '', copyable: true, masked: true },
    { label: 'Дата рождения', value: '', copyable: true, masked: false },
    { label: 'Кем выдан', value: '', copyable: true, masked: false },
    { label: 'Код подразделения', value: '', copyable: true, masked: false },
    { label: 'Дата выдачи', value: '', copyable: true, masked: false },
  ]);

  const applyTemplate = (tmpl: TemplateType) => {
    setSelectedTemplate(tmpl);
    haptic.selection();

    switch (tmpl) {
      case 'passport':
        setTitle('Паспорт РФ');
        setFields([
          { label: 'ФИО', value: '', copyable: true, masked: false },
          { label: 'Серия и номер', value: '', copyable: true, masked: true },
          { label: 'Дата рождения', value: '', copyable: true, masked: false },
          { label: 'Кем выдан', value: '', copyable: true, masked: false },
          { label: 'Код подразделения', value: '', copyable: true, masked: false },
          { label: 'Дата выдачи', value: '', copyable: true, masked: false },
        ]);
        break;
      case 'international_passport':
        setTitle('Загранпаспорт');
        setFields([
          { label: 'Surname / Given names', value: '', copyable: true, masked: false },
          { label: 'Passport No.', value: '', copyable: true, masked: true },
          { label: 'Date of Expiry', value: '', copyable: true, masked: false },
          { label: 'Authority', value: '', copyable: true, masked: false },
        ]);
        break;
      case 'snils':
        setTitle('СНИЛС');
        setFields([
          { label: 'Номер СНИЛС', value: '', copyable: true, masked: false },
        ]);
        break;
      case 'tickets':
        setTitle('Авиа/ЖД Билеты');
        setFields([
          { label: 'Номер рейса/поезда', value: '', copyable: true, masked: false },
          { label: 'Места', value: '', copyable: true, masked: false },
          { label: 'Дата и время', value: '', copyable: true, masked: false },
          { label: 'Код бронирования (PNR)', value: '', copyable: true, masked: false },
        ]);
        break;
      case 'custom':
        setTitle('Пользовательский документ');
        setFields([
          { label: 'Название реквизита', value: '', copyable: true, masked: false },
        ]);
        break;
    }
  };

  const handleFieldChange = (index: number, key: 'label' | 'value', val: string) => {
    setFields((prev) => {
      const next = [...prev];
      next[index][key] = val;
      return next;
    });
  };

  const addCustomField = () => {
    haptic.light();
    setFields((prev) => [...prev, { label: 'Поле', value: '', copyable: true, masked: false }]);
  };

  const removeField = (index: number) => {
    haptic.light();
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  // Real File Upload Handler (Images & PDF with automatic compression)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    haptic.light();
    setFileName(file.name);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setFileType(isPdf ? 'pdf' : 'image');

    const reader = new FileReader();
    reader.onload = () => {
      const rawResult = reader.result as string;

      if (isPdf) {
        setFileUrl(rawResult);
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        setFileSize(sizeInMb === '0.0' ? `${Math.round(file.size / 1024)} КБ` : `${sizeInMb} МБ`);
        haptic.success();
      } else {
        // Compress image using canvas to avoid localStorage quota issues & speed up sync
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // 75% quality JPEG gives crisp readable documents with ~150KB size
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setFileUrl(compressed);

          const approxBytes = Math.round((compressed.length * 3) / 4);
          const sizeKb = Math.round(approxBytes / 1024);
          setFileSize(`${sizeKb} КБ`);
          haptic.success();
        };
        img.src = rawResult;
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAttachedFile = () => {
    haptic.light();
    setFileUrl(undefined);
    setFileName('');
    setFileType(undefined);
    setFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const ownerName =
      ownerId === 'both'
        ? 'Для двоих'
        : ownerId === couple.partnerA.id
        ? couple.partnerA.name
        : couple.partnerB.name;

    addDocument({
      title: title.trim(),
      category: selectedTemplate === 'custom' ? 'other' : selectedTemplate,
      ownerId,
      ownerName,
      fields: fields.filter((f) => f.label.trim() && f.value.trim()),
      fileUrl,
      fileName: fileName.trim() || undefined,
      fileType,
      notes: notes.trim() || undefined,
    });

    haptic.success();
    onClose();
  };

  return (
    <ModalDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Добавить документ в сейф"
      subtitle="Загрузите фото/скан паспорта и заполните данные для копирования"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Real File Upload Section */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Файл / Скан документа
          </label>

          {/* Hidden HTML File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {!fileUrl ? (
            /* Upload Dropzone Button */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 rounded-[20px] border-2 border-dashed border-primary/30 bg-primary-light/20 hover:bg-primary-light/40 dark:bg-primary/10 dark:hover:bg-primary/20 flex flex-col items-center justify-center transition-all ios-press group"
            >
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform">
                <Upload size={22} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-bold text-foreground">
                Нажмите, чтобы загрузить скан или фото
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                Поддерживаются фото паспортов (JPG, PNG) и билеты (PDF)
              </span>
            </button>
          ) : (
            /* Uploaded Preview Card */
            <div className="p-3 rounded-[18px] bg-secondary/70 border border-border flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {fileType === 'image' ? (
                  <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-background shrink-0 border border-border">
                    <img
                      src={fileUrl}
                      alt="Превью скана"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-[10px] bg-primary-light dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <FileText size={24} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground truncate block">
                    {fileName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {fileSize} • {fileType === 'pdf' ? 'PDF Документ' : 'Изображение'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary hover:bg-secondary/80 text-foreground ios-press"
                >
                  Заменить
                </button>
                <button
                  type="button"
                  onClick={removeAttachedFile}
                  className="w-7 h-7 rounded-full bg-secondary hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center ios-press"
                  title="Удалить прикрепленный файл"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Template Selector Chips */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Шаблон реквизитов
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'passport', label: 'Паспорт РФ', icon: Shield },
              { id: 'international_passport', label: 'Загран', icon: Shield },
              { id: 'snils', label: 'СНИЛС', icon: FileText },
              { id: 'tickets', label: 'Билеты', icon: Plane },
              { id: 'custom', label: 'Свой', icon: Plus },
            ].map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              const Icon = tmpl.icon;
              return (
                <button
                  type="button"
                  key={tmpl.id}
                  onClick={() => applyTemplate(tmpl.id as TemplateType)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ios-press ${
                    isSelected
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tmpl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Название документа
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[14px] bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
            placeholder="Например: Паспорт РФ"
          />
        </div>

        {/* Owner Segmented Control */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Чей документ
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-[14px] bg-secondary">
            {[
              { id: couple.partnerA.id, label: couple.partnerA.name },
              { id: couple.partnerB.id, label: couple.partnerB.name },
              { id: 'both', label: 'Для обоих' },
            ].map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  haptic.selection();
                  setOwnerId(opt.id);
                }}
                className={`py-1.5 text-xs font-medium rounded-[10px] transition-all ios-press ${
                  ownerId === opt.id
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fields list with Quick Copy */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Поля для быстрого копирования
            </label>
            <button
              type="button"
              onClick={addCustomField}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5"
            >
              <Plus size={13} /> Добавить
            </button>
          </div>

          <div className="space-y-1.5">
            {fields.map((field, idx) => (
              <div key={idx} className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                  className="w-1/3 px-2.5 py-2 rounded-[11px] bg-secondary border-0 text-xs text-foreground focus:outline-none font-medium"
                  placeholder="Поле"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                  className="flex-1 px-2.5 py-2 rounded-[11px] bg-secondary border-0 text-xs text-foreground focus:outline-none font-mono"
                  placeholder="Значение"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Заметка (необязательно)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[14px] bg-secondary border-0 text-xs text-foreground focus:outline-none font-medium"
            placeholder="Для авиабилетов, визы или Госуслуг"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full mt-2 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary-hover ios-press flex items-center justify-center space-x-1.5"
        >
          <Check size={17} strokeWidth={2.5} />
          <span>Сохранить в сейф</span>
        </button>
      </form>
    </ModalDrawer>
  );
};
