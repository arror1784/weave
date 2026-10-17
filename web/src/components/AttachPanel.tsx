import { useRef, useState, type FormEvent } from 'react';

import { addLink, deleteAttachment, uploadAttachment } from '@/api/attachments';
import { errorMessage } from '@/api/errors';
import type { Attachment } from '@/api/types';
import { linkSchema } from '@/lib/validation';

import { IFile, ILink, IUpload, IX, ITrash } from './icons';
import { Btn, Card, inputClass, Label, Spinner } from './ui';

/** 올리는 중·실패한 파일(아직 서버 첨부가 아님) */
type Pending = { localId: number; name: string; file: File; error?: string };

/**
 * 참고자료 — 고르는(끌어다 놓는) 즉시 서버에 올리고, 등록할 때 id로 연결한다(앱과 같다).
 * 형식·크기·사진 위치정보는 서버가 검사하고, 거절하면 그 이유를 보여준다.
 * 진행률(%)은 fetch로 알 수 없어 "올리는 중"만 보여준다.
 */
export function AttachPanel({ attachments, onChange }: { attachments: Attachment[]; onChange: (update: (list: Attachment[]) => Attachment[]) => void }) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [drag, setDrag] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);

  async function upload(file: File, localId = ++sequence.current) {
    setPending((list) => [...list.filter((p) => p.localId !== localId), { localId, name: file.name, file }]);
    try {
      const saved = await uploadAttachment(file);
      setPending((list) => list.filter((p) => p.localId !== localId));
      onChange((list) => [...list, saved]);
    } catch (e) {
      setPending((list) => list.map((p) => (p.localId === localId ? { ...p, error: errorMessage(e) } : p)));
    }
  }

  function addFiles(files: FileList | File[] | null) {
    for (const file of Array.from(files ?? [])) void upload(file);
  }

  async function submitLink(e: FormEvent) {
    e.preventDefault();
    const parsed = linkSchema.safeParse(link);
    if (!parsed.success) {
      setLinkError(parsed.error.issues[0]?.message ?? '주소를 확인해 주세요.');
      return;
    }
    setLinkError(null);
    try {
      const saved = await addLink(parsed.data);
      onChange((list) => [...list, saved]);
      setLink('');
    } catch (err) {
      setLinkError(errorMessage(err));
    }
  }

  async function remove(a: Attachment) {
    setRemoveError(null);
    try {
      await deleteAttachment(a.id);
      onChange((list) => list.filter((x) => x.id !== a.id));
    } catch (e) {
      setRemoveError(errorMessage(e));
    }
  }

  const count = attachments.length + pending.length;
  return (
    <Card className="p-6">
      <h2 className="text-[16px] font-bold">참고자료</h2>
      <p className="mt-1 text-[13px] text-ink-soft">과제 공지·채점 기준을 올리면 AI가 더 정확하게 쪼개요.</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${drag ? 'border-thread bg-thread-soft' : 'border-line bg-canvas'}`}
      >
        <span className="grid size-11 place-items-center rounded-xl bg-white text-thread">
          <IUpload size={22} />
        </span>
        <p className="mt-3 text-[15px] font-semibold">{drag ? '여기에 놓으세요' : '파일을 끌어다 놓으세요'}</p>
        <Btn kind="line" className="mt-3 h-9 px-3.5 text-[14px]" onClick={() => fileRef.current?.click()}>
          파일 고르기
        </Btn>
        <input
          ref={fileRef}
          type="file"
          multiple
          aria-label="파일 고르기"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <details className="mt-3 text-[13px] text-ink-soft">
        <summary className="cursor-pointer select-none rounded font-medium">올릴 수 있는 형식</summary>
        <ul className="mt-2 space-y-1 leading-relaxed">
          <li>PDF · 사진(jpg·png·gif·webp, HEIC는 위치정보 없을 때만)</li>
          <li>Office(doc·docx·xls·xlsx·ppt·pptx) · 한글(hwp·hwpx)</li>
          <li>글자 파일(txt·md·csv 등) · zip · 음성(mp3·m4a·wav)</li>
        </ul>
      </details>
      <form className="mt-5" onSubmit={submitLink} noValidate>
        <Label htmlFor="link">링크 추가</Label>
        <div className="flex gap-2">
          <input
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://"
            aria-invalid={!!linkError}
            aria-describedby="link-error"
            className={`${inputClass} h-11 ${linkError ? 'border-danger-text' : ''}`}
          />
          <Btn type="submit" kind="soft" disabled={!link.trim()}>
            추가
          </Btn>
        </div>
        {linkError && (
          <p id="link-error" role="alert" className="mt-1.5 text-[13px] text-danger-text">
            {linkError}
          </p>
        )}
      </form>
      <div className="mt-5">
        <p className="mb-2 text-[13px] font-semibold text-ink-soft">
          첨부 <span className="num">{count}</span>
        </p>
        {removeError && (
          <p role="alert" className="mb-2 text-[13px] text-danger-text">
            {removeError}
          </p>
        )}
        {count === 0 ? (
          <p className="rounded-xl border border-line px-4 py-5 text-center text-[14px] text-ink-soft">아직 첨부한 자료가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                <span className="text-ink-soft">{a.kind === 'link' ? <ILink size={19} /> : <IFile size={19} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{a.name}</p>
                  <p className="num mt-0.5 text-[12px] text-ink-soft">{a.kind === 'link' ? '링크' : formatSize(a.size)}</p>
                </div>
                <button type="button" onClick={() => remove(a)} aria-label={`${a.name} 삭제`} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-canvas hover:text-ink">
                  <ITrash size={18} />
                </button>
              </li>
            ))}
            {pending.map((p) => (
              <li key={p.localId} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${p.error ? 'border-danger-line bg-danger-soft' : 'border-line'}`}>
                <span className={p.error ? 'text-danger-text' : 'text-ink-soft'}>
                  <IFile size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{p.name}</p>
                  {p.error ? (
                    <p role="alert" className="mt-0.5 text-[12px] font-medium text-danger-text">
                      {p.error}
                    </p>
                  ) : (
                    <p className="mt-1 flex items-center gap-2 text-[12px] text-ink-soft">
                      <Spinner size={12} label={`${p.name} 올리는 중`} />
                      올리는 중
                    </p>
                  )}
                </div>
                {p.error && (
                  <button type="button" onClick={() => upload(p.file, p.localId)} className="rounded-lg px-2 py-1 text-[13px] font-semibold text-danger-text hover:bg-white">
                    다시 시도
                  </button>
                )}
                {p.error && (
                  <button
                    type="button"
                    onClick={() => setPending((list) => list.filter((x) => x.localId !== p.localId))}
                    aria-label={`${p.name} 목록에서 빼기`}
                    className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-white hover:text-ink"
                  >
                    <IX size={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function formatSize(size?: number) {
  if (size === undefined) return '';
  return size >= 1e6 ? `${(size / 1e6).toFixed(1)}MB` : `${Math.max(1, Math.round(size / 1e3))}KB`;
}
