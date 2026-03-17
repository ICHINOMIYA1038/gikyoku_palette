type PlayBodyProps = {
  body: string;
};

export function PlayBody({ body }: PlayBodyProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-6 sm:p-8">
      <pre className="whitespace-pre-wrap break-words font-sans text-base leading-relaxed">
        {body}
      </pre>
    </div>
  );
}
