import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ExceptionEngine } from '../../rules/exception.engine';
import { captureException } from '../../utils/sentry';

const router = Router();
const exceptionEngine = new ExceptionEngine();

router.get('/exceptions/pending', async (req: Request, res: Response) => {
  let clientId: string | undefined;
  try {
    ({ clientId } = z.object({ clientId: z.string().optional() }).parse(req.query));
    const exceptions = await exceptionEngine.getPendingExceptions(clientId as string | undefined);
    res.json(exceptions);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    captureException(error, {
      operation: 'getPendingExceptions',
      clientId,
    });
    res.status(500).json({ error: 'Failed to get exceptions' });
  }
});

router.post('/exceptions/:id/review', async (req: Request, res: Response) => {
  let params: { id: string } | undefined;
  let body: { action: 'approve' | 'reject'; userId: string; helpdeskTicketId?: string } | undefined;
  try {
    params = z.object({ id: z.string() }).parse(req.params);
    body = z
      .object({
        action: z.enum(['approve', 'reject']),
        userId: z.string(),
        helpdeskTicketId: z.string().optional()
      })
      .parse(req.body);

    if (body.action === 'approve') {
      await exceptionEngine.approveException(params.id, body.userId, body.helpdeskTicketId);
    } else {
      await exceptionEngine.rejectException(params.id, body.userId);
    }

    res.json({ success: true, exceptionId: params.id, action: body.action });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    captureException(error, {
      operation: 'reviewException',
      exceptionId: params?.id,
      action: body?.action,
      userId: body?.userId,
      helpdeskTicketId: body?.helpdeskTicketId,
    });
    res.status(500).json({ error: 'Failed to review exception' });
  }
});

export default router;
