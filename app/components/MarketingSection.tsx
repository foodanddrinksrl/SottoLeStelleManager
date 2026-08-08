'use client';

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

type MarketingView =
  | 'home'
  | 'contatti'
  | 'campagne'
  | 'editor';

type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed';

type RecipientMode =
  | 'all'
  | 'manual';

type ApiRecipient = {
  id: string;
  phone: string;
  customer_name?: string | null;
  message_status: string;
};

type ApiCampaign = {
  id: string;
  name: string;
  message: string;
  image_url?: string | null;
  button_text: string;
  button_url?: string | null;
  status: CampaignStatus;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
  recipient_count?: number;
  pending_count?: number;
  sent_count?: number;
  failed_count?: number;
  marketing_recipients?: ApiRecipient[];
};

type MarketingContact = {
  id: string;
  name?: string | null;
  phone: string;
  active: boolean;
  whatsapp_valid: boolean;
  created_at: string;
};

type ImportResult = {
  ok: boolean;
  received?: number;
  valid?: number;
  uniqueInFile?: number;
  duplicatesInFile?: number;
  duplicatesInArchive?: number;
  inserted?: number;
  message?: string;
  error?: string;
};

type SendProgress = {
  active: boolean;
  total: number;
  processed: number;
  sent: number;
  failed: number;
  pending: number;
  percent: number;
};

const OCTOTABLE_URL =
  'https://book.octotable.com/otb/form/index.xhtml?pubkey=6321a9639e364497a9a5d460525f6bfe&property=115839';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const SEND_BATCH_SIZE = 500;


function normalizzaNumero(phone: string) {
  let numero = String(phone ?? '').replace(/\D/g, '');

  if (numero.startsWith('0039')) {
    numero = numero.slice(2);
  }

  if (numero.startsWith('00')) {
    numero = numero.slice(2);
  }

  if (
    !numero.startsWith('39') &&
    numero.length === 10
  ) {
    numero = `39${numero}`;
  }

  return numero;
}

function numeroValido(phone: string) {
  return phone.length >= 11 && phone.length <= 15;
}

function estraiDestinatari(testo: string) {
  return Array.from(
    new Set(
      testo
        .split(/[\n,;]+/)
        .map(normalizzaNumero)
        .filter(numeroValido)
    )
  );
}

function etichettaStato(status: CampaignStatus) {
  switch (status) {
    case 'scheduled':
      return '📅 Programmata';
    case 'sending':
      return '⏳ In invio';
    case 'sent':
      return '✅ Inviata';
    case 'failed':
      return '❌ Errore';
    default:
      return '📝 Bozza';
  }
}

function formattaData(data?: string | null) {
  if (!data) return '—';

  const valore = new Date(data);

  if (Number.isNaN(valore.getTime())) {
    return '—';
  }

  return valore.toLocaleString('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}


function trovaValore(
  row: Record<string, unknown>,
  aliases: string[]
) {
  const entries = Object.entries(row);

  for (const alias of aliases) {
    const found = entries.find(
      ([key]) =>
        key.trim().toLowerCase() ===
        alias.trim().toLowerCase()
    );

    if (found) {
      return String(found[1] ?? '').trim();
    }
  }

  return '';
}


export function MarketingSection() {
  const [view, setView] =
    useState<MarketingView>('home');

  const [campaigns, setCampaigns] =
    useState<ApiCampaign[]>([]);

  const [showSavedCampaigns, setShowSavedCampaigns] =
    useState(false);

  const [contacts, setContacts] =
    useState<MarketingContact[]>([]);


  const [loading, setLoading] =
    useState(false);

  const [loadingContacts, setLoadingContacts] =
    useState(false);

  const [importingContacts, setImportingContacts] =
    useState(false);

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [searchContact, setSearchContact] =
    useState('');

  const [importMessage, setImportMessage] =
    useState('');

  const [testPhone, setTestPhone] =
    useState('');

  const [sendingTest, setSendingTest] =
    useState(false);

  const [testResult, setTestResult] =
    useState('');

  const [sendProgress, setSendProgress] =
    useState<SendProgress | null>(null);

  const [name, setName] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [recipientMode, setRecipientMode] =
    useState<RecipientMode>('all');


  const [recipientsText, setRecipientsText] =
    useState('');

  const [scheduledAt, setScheduledAt] =
    useState('');

  const [useBooking, setUseBooking] =
    useState(true);

  const [bookingUrl, setBookingUrl] =
    useState(OCTOTABLE_URL);

  const [imageName, setImageName] =
    useState('');

  const [imagePreview, setImagePreview] =
    useState('');

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imageUrl, setImageUrl] =
    useState('');

  const manualRecipients = useMemo(
    () => estraiDestinatari(recipientsText),
    [recipientsText]
  );

  const totalContacts = contacts.length;

  const estimatedRecipients = useMemo(() => {
    return recipientMode === 'all'
      ? totalContacts
      : manualRecipients.length;
  }, [
    recipientMode,
    totalContacts,
    manualRecipients.length,
  ]);

  const totalRecipients = useMemo(
    () =>
      campaigns.reduce(
        (total, campaign) =>
          total +
          (
            campaign.marketing_recipients
              ?.length ?? 0
          ),
        0
      ),
    [campaigns]
  );

  const scheduledCampaigns =
    campaigns.filter(
      (campaign) =>
        campaign.status === 'scheduled'
    ).length;

  const sentCampaigns =
    campaigns.filter(
      (campaign) =>
        campaign.status === 'sent'
    ).length;

  const filteredContacts = useMemo(() => {
    const query = searchContact
      .trim()
      .toLowerCase();

    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const nameValue =
        contact.name?.toLowerCase() ?? '';

      return (
        nameValue.includes(query) ||
        contact.phone.includes(query)
      );
    });
  }, [contacts, searchContact]);

  async function loadCampaigns() {
    try {
      setLoading(true);

      const response = await fetch(
        '/api/campaigns',
        {
          cache: 'no-store',
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            'Impossibile caricare le campagne.'
        );
      }

      setCampaigns(result.campaigns ?? []);
    } catch (error) {
      console.error(
        'Errore caricamento campagne:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Errore caricamento campagne.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadContacts() {
    try {
      setLoadingContacts(true);

      const response = await fetch(
        '/api/marketing/contacts',
        {
          cache: 'no-store',
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            'Impossibile caricare i contatti.'
        );
      }

      const loadedContacts =
        (result.contacts ?? []) as MarketingContact[];

      setContacts(loadedContacts);

    } catch (error) {
      console.error(
        'Errore caricamento contatti:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Errore caricamento contatti.'
      );
    } finally {
      setLoadingContacts(false);
    }
  }

  useEffect(() => {
    void loadCampaigns();
    void loadContacts();
  }, []);

  function resetEditor() {
    setName('');
    setMessage('');
    setRecipientMode('all');
    setRecipientsText('');
    setScheduledAt('');
    setUseBooking(true);
    setBookingUrl(OCTOTABLE_URL);
    setImageName('');
    setImagePreview('');
    setImageFile(null);
    setImageUrl('');
    setSendProgress(null);
  }

  function openEditor() {
    resetEditor();
    setView('editor');
  }


  async function resolveRecipients() {
    if (recipientMode === 'manual') {
      return manualRecipients;
    }

    const response = await fetch(
      '/api/marketing/contacts?phones=1',
      {
        cache: 'no-store',
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(
        result.error ||
          'Impossibile recuperare i destinatari.'
      );
    }

    return Array.from(
      new Set(
        (result.contacts ?? [])
          .map(
            (contact: { phone?: string }) =>
              normalizzaNumero(
                contact.phone ?? ''
              )
          )
          .filter(numeroValido)
      )
    ) as string[];
  }

  async function aggiornaProgressoInvio(
    campaignId: string
  ) {
    try {
      const response = await fetch(
        `/api/campaigns/progress?campaignId=${encodeURIComponent(
          campaignId
        )}`,
        {
          cache: 'no-store',
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        return;
      }

      setSendProgress({
        active: true,
        total: result.total ?? 0,
        processed: result.processed ?? 0,
        sent: result.sent ?? 0,
        failed: result.failed ?? 0,
        pending: result.pending ?? 0,
        percent: result.percent ?? 0,
      });
    } catch (error) {
      console.error(
        'Errore aggiornamento progresso invio:',
        error
      );
    }
  }

  function validateCampaign(
    status: CampaignStatus
  ) {
    if (!name.trim()) {
      alert(
        'Inserisci il nome della campagna.'
      );

      return false;
    }

    if (!message.trim()) {
      alert(
        'Scrivi il messaggio della campagna.'
      );

      return false;
    }

    if (
      recipientMode === 'manual' &&
      manualRecipients.length === 0
    ) {
      alert(
        'Inserisci almeno un destinatario valido.'
      );

      return false;
    }

    if (
      recipientMode !== 'manual' &&
      totalContacts === 0
    ) {
      alert(
        'Prima importa almeno una lista di contatti.'
      );

      return false;
    }

    if (
      status === 'scheduled' &&
      !scheduledAt
    ) {
      alert(
        'Seleziona data e ora della programmazione.'
      );

      return false;
    }

    if (
      useBooking &&
      !bookingUrl.trim()
    ) {
      alert(
        'Inserisci il collegamento per la prenotazione.'
      );

      return false;
    }

    return true;
  }

  async function uploadCampaignImage():
    Promise<string | null> {
    if (imageUrl) {
      return imageUrl;
    }

    if (!imageFile) {
      return null;
    }

    try {
      setUploadingImage(true);

      const formData = new FormData();

      formData.append(
        'file',
        imageFile
      );

      const response = await fetch(
        '/api/marketing/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            'Impossibile caricare l’immagine.'
        );
      }

      const uploadedUrl =
        result.imageUrl as string;

      setImageUrl(uploadedUrl);

      return uploadedUrl;
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveCampaign(
    status: 'draft' | 'scheduled',
    prepareSend = false
  ) {
    if (!validateCampaign(status)) {
      return;
    }

    try {
      setLoading(true);

      const recipients =
        await resolveRecipients();

      if (recipients.length === 0) {
        throw new Error(
          'Nessun destinatario disponibile per questa selezione.'
        );
      }

      const uploadedImageUrl =
        await uploadCampaignImage();

      const response = await fetch(
        '/api/campaigns',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            message: message.trim(),
            recipients,
            imageUrl:
              uploadedImageUrl,
            buttonText:
              useBooking
                ? 'Prenota il tavolo'
                : '',
            buttonUrl:
              useBooking
                ? bookingUrl.trim()
                : null,
            status,
            scheduledAt:
              status === 'scheduled'
                ? scheduledAt
                : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            'Impossibile salvare la campagna.'
        );
      }

      if (prepareSend) {
        const campaignId =
          result.campaign?.id ??
          result.campaignId ??
          result.id;

        if (!campaignId) {
          throw new Error(
            'Campagna salvata, ma non è stato restituito il suo ID.'
          );
        }

        setSendProgress({
          active: true,
          total: recipients.length,
          processed: 0,
          sent: 0,
          failed: 0,
          pending: recipients.length,
          percent: 0,
        });

        await aggiornaProgressoInvio(
          campaignId
        );

        const progressTimer =
          window.setInterval(() => {
            void aggiornaProgressoInvio(
              campaignId
            );
          }, 1000);

        try {
          let totalSent = 0;
          let totalFailed = 0;
          let remaining = recipients.length;
          let batchNumber = 0;

          while (remaining > 0) {
            batchNumber += 1;

            const sendResponse = await fetch(
              '/api/campaigns/send',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify({
                  campaignId,
                  maxRecipients:
                    SEND_BATCH_SIZE,
                }),
              }
            );

            const sendResult =
              await sendResponse.json();

            if (
              !sendResponse.ok ||
              !sendResult.ok
            ) {
              throw new Error(
                sendResult.error ||
                  sendResult.message ||
                  'Invio WhatsApp non riuscito.'
              );
            }

            const sentThisBatch =
              sendResult.sent ?? 0;

            const failedThisBatch =
              sendResult.failed ?? 0;

            totalSent += sentThisBatch;
            totalFailed += failedThisBatch;

            remaining =
              sendResult.remaining ?? 0;

            await aggiornaProgressoInvio(
              campaignId
            );

            const processedThisBatch =
              sentThisBatch +
              failedThisBatch;

            if (
              remaining > 0 &&
              processedThisBatch === 0
            ) {
              throw new Error(
                `Invio fermato per sicurezza: restano ${remaining} destinatari, ma il gruppo ${batchNumber} non ha elaborato nessun contatto.`
              );
            }

            if (remaining > 0) {
              await new Promise(
                (resolve) =>
                  window.setTimeout(
                    resolve,
                    1500
                  )
              );
            }
          }

          setSendProgress({
            active: false,
            total: recipients.length,
            processed:
              totalSent + totalFailed,
            sent: totalSent,
            failed: totalFailed,
            pending: 0,
            percent: 100,
          });

          alert(
            `✅ Invio completato\n\n` +
              `Gruppi da: ${SEND_BATCH_SIZE}\n` +
              `Inviati: ${totalSent}\n` +
              `Errori: ${totalFailed}\n` +
              `Rimanenti: 0\n` +
              `Gruppi elaborati: ${batchNumber}`
          );
        } finally {
          window.clearInterval(
            progressTimer
          );
        }
      } else {
        alert(
          status === 'scheduled'
            ? `Campagna programmata per ${recipients.length} destinatari.`
            : `Bozza salvata con ${recipients.length} destinatari.`
        );
      }

      await loadCampaigns();

      resetEditor();
      setView('campagne');
    } catch (error) {
      console.error(
        'Errore salvataggio campagna:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Errore durante il salvataggio.'
      );
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  }

  async function continuaCampagnaSalvata(
    campaign: ApiCampaign
  ) {
    try {
      setLoading(true);

      const progressResponse = await fetch(
        `/api/campaigns/progress?campaignId=${encodeURIComponent(
          campaign.id
        )}`,
        {
          cache: 'no-store',
        }
      );

      const progressResult =
        await progressResponse.json();

      if (
        !progressResponse.ok ||
        !progressResult.ok
      ) {
        throw new Error(
          progressResult.error ||
            'Impossibile controllare i destinatari rimanenti.'
        );
      }

      const exactPending =
        Number(progressResult.pending ?? 0);

      const exactTotal =
        Number(progressResult.total ?? 0);

      const alreadySent =
        Number(progressResult.sent ?? 0);

      const alreadyFailed =
        Number(progressResult.failed ?? 0);

      if (exactPending === 0) {
        alert(
          `Questa campagna non ha destinatari in attesa.\n\n` +
            `Totale: ${exactTotal}\n` +
            `Già inviati: ${alreadySent}\n` +
            `Errori: ${alreadyFailed}`
        );
        return;
      }

      const confirmed = window.confirm(
        `Continuare questa campagna?\n\n` +
          `Campagna: ${campaign.name}\n` +
          `Totale campagna: ${exactTotal}\n` +
          `Già inviati: ${alreadySent}\n` +
          `Errori già registrati: ${alreadyFailed}\n` +
          `Ancora da inviare: ${exactPending}\n\n` +
          `Procederò automaticamente a gruppi da ${SEND_BATCH_SIZE}.\n` +
          `I destinatari già inviati NON verranno reinviati.`
      );

      if (!confirmed) {
        return;
      }

      let remaining = exactPending;
      let totalSent = 0;
      let totalFailed = 0;
      let batchNumber = 0;

      while (remaining > 0) {
        batchNumber += 1;

        const response = await fetch(
          '/api/campaigns/send',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              campaignId: campaign.id,
              maxRecipients:
                SEND_BATCH_SIZE,
            }),
          }
        );

        const result =
          await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ||
              result.message ||
              'Impossibile continuare l’invio.'
          );
        }

        const sentThisBatch =
          Number(result.sent ?? 0);

        const failedThisBatch =
          Number(result.failed ?? 0);

        totalSent += sentThisBatch;
        totalFailed += failedThisBatch;

        remaining =
          Number(result.remaining ?? 0);

        const processedThisBatch =
          sentThisBatch +
          failedThisBatch;

        if (
          remaining > 0 &&
          processedThisBatch === 0
        ) {
          throw new Error(
            `Invio fermato per sicurezza: restano ${remaining} destinatari, ma il gruppo ${batchNumber} non ha elaborato nessun contatto.`
          );
        }

        if (remaining > 0) {
          await new Promise(
            (resolve) =>
              window.setTimeout(
                resolve,
                1500
              )
          );
        }
      }

      await loadCampaigns();

      alert(
        `✅ Campagna completata\n\n` +
          `Nuovi inviati: ${totalSent}\n` +
          `Nuovi errori: ${totalFailed}\n` +
          `Rimanenti: 0\n` +
          `Gruppi elaborati: ${batchNumber}`
      );
    } catch (error) {
      console.error(
        'Errore continuazione campagna:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Errore durante la continuazione della campagna.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendWhatsAppTest() {
    const phone = normalizzaNumero(testPhone);

    if (!numeroValido(phone)) {
      alert(
        'Inserisci il tuo numero WhatsApp con prefisso internazionale.'
      );

      return;
    }

    try {
      setSendingTest(true);
      setTestResult('');

      const response = await fetch(
        '/api/marketing/send-test',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            phone,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            'Invio di prova non riuscito.'
        );
      }

      setTestResult(
        '✅ Messaggio di prova inviato. Controlla WhatsApp.'
      );
    } catch (error) {
      console.error(
        'Errore test WhatsApp:',
        error
      );

      setTestResult(
        `❌ ${
          error instanceof Error
            ? error.message
            : 'Invio di prova non riuscito.'
        }`
      );
    } finally {
      setSendingTest(false);
    }
  }

  async function handleContactsImport(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    if (files.length === 0) {
      return;
    }

    try {
      setImportingContacts(true);
      setImportMessage('');

      const XLSX = await import('xlsx');

      let totalInserted = 0;
      let totalDuplicates = 0;
      let totalReceived = 0;
      const messages: string[] = [];

      for (const file of files) {
        const buffer =
          await file.arrayBuffer();

        const workbook =
          XLSX.read(buffer, {
            type: 'array',
          });

        const sheetName =
          workbook.SheetNames[0];

        if (!sheetName) {
          messages.push(
            `${file.name}: nessun foglio trovato.`
          );
          continue;
        }

        const rows =
          XLSX.utils.sheet_to_json<
            Record<string, unknown>
          >(
            workbook.Sheets[sheetName],
            {
              defval: '',
            }
          );

        const parsedContacts = rows
          .map((row) => {
            const phone =
              trovaValore(row, [
                'Telefono_validato',
                'Telefono validato',
                'Telefono',
                'Cellulare',
                'Numero',
                'Phone',
              ]);

            const nameValue =
              trovaValore(row, [
                'Denominazione',
                'Nome',
                'Cliente',
                'Ragione sociale',
              ]);

            const esito =
              trovaValore(row, [
                'Esito',
                'Stato',
              ]).toUpperCase();

            return {
              name: nameValue || null,
              phone,
              whatsappValid:
                !esito ||
                esito.includes('VALIDO'),
            };
          })
          .filter(
            (contact) =>
              Boolean(contact.phone)
          );

        if (parsedContacts.length === 0) {
          messages.push(
            `${file.name}: nessun contatto riconosciuto.`
          );
          continue;
        }

        const response = await fetch(
          '/api/marketing/contacts/import',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              contacts: parsedContacts,
            }),
          }
        );

        const result =
          (await response.json()) as ImportResult;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ||
              `Importazione non riuscita per ${file.name}.`
          );
        }

        const inserted =
          result.inserted ?? 0;

        const duplicates =
          (result.duplicatesInFile ?? 0) +
          (result.duplicatesInArchive ?? 0);

        totalInserted += inserted;
        totalDuplicates += duplicates;
        totalReceived +=
          result.received ?? 0;

        messages.push(
          `${file.name}: ${inserted} nuovi, ${duplicates} doppioni ignorati.`
        );
      }

      setImportMessage(
        [
          `✅ Importazione completata`,
          `Righe lette: ${totalReceived}`,
          `Nuovi contatti: ${totalInserted}`,
          `Doppioni ignorati: ${totalDuplicates}`,
          '',
          ...messages,
        ].join('\n')
      );

      await loadContacts();
    } catch (error) {
      console.error(
        'Errore importazione contatti:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Errore durante l’importazione.'
      );
    } finally {
      setImportingContacts(false);
      event.target.value = '';
    }
  }

  function handleImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith('image/')
    ) {
      alert(
        'Seleziona un’immagine valida.'
      );

      event.target.value = '';

      return;
    }

    if (
      file.size > MAX_IMAGE_SIZE
    ) {
      alert(
        'L’immagine non può superare 5 MB.'
      );

      event.target.value = '';

      return;
    }

    setImageName(file.name);
    setImageFile(file);
    setImageUrl('');

    const reader =
      new FileReader();

    reader.onload = () => {
      setImagePreview(
        typeof reader.result === 'string'
          ? reader.result
          : ''
      );
    };

    reader.onerror = () => {
      alert(
        'Non è stato possibile leggere l’immagine.'
      );

      setImageName('');
      setImagePreview('');
      setImageFile(null);
      setImageUrl('');
    };

    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageName('');
    setImagePreview('');
    setImageFile(null);
    setImageUrl('');
  }

  if (view === 'contatti') {
    return (
      <section>
        <div className="card">
          <button
            type="button"
            className="btn green"
            disabled={loadingContacts}
            onClick={() =>
              setView('home')
            }
          >
            ← Centro Marketing
          </button>
        </div>

        <div className="card">
          <h2>👥 Contatti campagne</h2>

          <p className="muted">
            Importa file Excel o CSV. Tutti i
            numeri confluiscono in un unico
            archivio e i doppioni vengono
            ignorati automaticamente.
          </p>
        </div>

        <div className="dashboard">
          <div className="kpi gold">
            <span>
              👥 Contatti disponibili
            </span>
            <strong>
              {totalContacts}
            </strong>
            <small>
              Numeri WhatsApp validi
            </small>
          </div>

        </div>

        <div className="card">
          <h2>📥 Importa Excel</h2>

          <p className="muted">
            Puoi selezionare uno o più file
            Excel o CSV contemporaneamente.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            disabled={
              importingContacts ||
              loadingContacts
            }
            onChange={
              handleContactsImport
            }
          />

          {importingContacts && (
            <p>
              <strong>
                ⏳ Importazione e controllo
                doppioni...
              </strong>
            </p>
          )}

          {importMessage && (
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                background:
                  'rgba(0,0,0,0.05)',
                padding: 14,
                borderRadius: 12,
                marginTop: 16,
              }}
            >
              {importMessage}
            </pre>
          )}
        </div>

        <div className="card">
          <h2>🔍 Elenco contatti</h2>

          <input
            type="search"
            value={searchContact}
            onChange={(event) =>
              setSearchContact(
                event.target.value
              )
            }
            placeholder="Cerca nome o numero..."
            style={{
              width: '100%',
              maxWidth: 520,
              marginBottom: 16,
            }}
          />

          {loadingContacts ? (
            <p>⏳ Caricamento...</p>
          ) : (
            <div
              style={{
                overflowX: 'auto',
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefono</th>
                    <th>Stato</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContacts
                    .slice(0, 300)
                    .map((contact) => (
                      <tr key={contact.id}>
                        <td>
                          {contact.name ||
                            '—'}
                        </td>
                        <td>
                          {contact.phone}
                        </td>
                        <td>
                          {contact.active &&
                          contact.whatsapp_valid
                            ? '🟢 Valido'
                            : '🚫 Escluso'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredContacts.length > 300 && (
            <p className="muted">
              Sono mostrati i primi 300
              risultati. Usa la ricerca per
              trovare un contatto preciso.
            </p>
          )}
        </div>
      </section>
    );
  }

  if (view === 'editor') {
    return (
      <section>
        <div className="card">
          <button
            type="button"
            className="btn green"
            disabled={
              loading ||
              uploadingImage
            }
            onClick={() =>
              setView('campagne')
            }
          >
            ← Campagne
          </button>
        </div>

        <div className="card">
          <h2>
            📢 Crea nuova campagna
          </h2>

          <p className="muted">
            Scegli i destinatari
            dall’archivio, prepara il
            messaggio e salva la campagna.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(0, 1.4fr) minmax(300px, 0.7fr)',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <div>
            <div className="card">
              <h2>
                1. Dati campagna
              </h2>

              <label>
                <strong>
                  Nome interno della campagna
                </strong>
              </label>

              <input
                type="text"
                value={name}
                disabled={loading}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Esempio: Pizza Estate luglio"
                style={{
                  width: '100%',
                  marginTop: 8,
                }}
              />
            </div>

            <div className="card">
              <h2>2. Destinatari</h2>

              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <input
                  type="radio"
                  name="recipientMode"
                  checked={
                    recipientMode === 'all'
                  }
                  onChange={() =>
                    setRecipientMode('all')
                  }
                />
                <strong>
                  Tutti i contatti (
                  {totalContacts})
                </strong>
              </label>

              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <input
                  type="radio"
                  name="recipientMode"
                  checked={
                    recipientMode ===
                    'manual'
                  }
                  onChange={() =>
                    setRecipientMode(
                      'manual'
                    )
                  }
                />
                <strong>
                  Inserimento manuale
                </strong>
              </label>

              {recipientMode ===
                'manual' && (
                <textarea
                  value={
                    recipientsText
                  }
                  disabled={loading}
                  onChange={(event) =>
                    setRecipientsText(
                      event.target.value
                    )
                  }
                  placeholder={
                    '3921234567\n3339876543'
                  }
                  rows={6}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                  }}
                />
              )}

              <p>
                <strong>
                  👥 Destinatari stimati:{' '}
                  {estimatedRecipients}
                </strong>
              </p>
            </div>

            <div className="card">
              <h2>
                3. Messaggio WhatsApp
              </h2>

              <textarea
                value={message}
                disabled={loading}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="Scrivi il messaggio della campagna..."
                rows={10}
                maxLength={1024}
                style={{
                  width: '100%',
                  resize: 'vertical',
                }}
              />

              <p className="muted">
                {message.length} / 1024
                caratteri
              </p>
            </div>

            <div className="card">
              <h2>4. Immagine</h2>

              <p className="muted">
                Carica una locandina JPG,
                PNG o WEBP. Dimensione
                massima: 5 MB.
              </p>

              <input
                type="file"
                accept="image/*"
                disabled={
                  loading ||
                  uploadingImage
                }
                onChange={
                  handleImage
                }
              />

              {imageName && (
                <div
                  style={{
                    marginTop: 14,
                  }}
                >
                  <p className="muted">
                    Immagine selezionata:{' '}
                    <strong>
                      {imageName}
                    </strong>
                  </p>

                  <button
                    type="button"
                    className="btn danger"
                    disabled={
                      loading ||
                      uploadingImage
                    }
                    onClick={
                      removeImage
                    }
                  >
                    🗑 Rimuovi immagine
                  </button>
                </div>
              )}

              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Anteprima locandina"
                  style={{
                    display: 'block',
                    width: '100%',
                    maxWidth: 450,
                    maxHeight: 350,
                    objectFit: 'contain',
                    borderRadius: 14,
                    marginTop: 18,
                  }}
                />
              )}

              {uploadingImage && (
                <p>
                  <strong>
                    ⏳ Caricamento
                    immagine su Supabase...
                  </strong>
                </p>
              )}
            </div>

            <div className="card">
              <h2>5. Prenotazione</h2>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={useBooking}
                  disabled={loading}
                  onChange={(event) =>
                    setUseBooking(
                      event.target.checked
                    )
                  }
                />

                <strong>
                  Mostra il pulsante
                  “Prenota il tavolo”
                </strong>
              </label>

              {useBooking && (
                <input
                  type="url"
                  value={bookingUrl}
                  disabled={loading}
                  onChange={(event) =>
                    setBookingUrl(
                      event.target.value
                    )
                  }
                  style={{
                    width: '100%',
                    marginTop: 14,
                  }}
                />
              )}
            </div>

            <div className="card">
              <h2>
                6. Salva, prepara o programma
              </h2>

              <div className="actions">
                <button
                  type="button"
                  className="btn gold"
                  disabled={
                    loading ||
                    uploadingImage
                  }
                  onClick={() =>
                    void saveCampaign(
                      'draft'
                    )
                  }
                >
                  {loading
                    ? '⏳ Salvataggio...'
                    : '💾 Salva bozza'}
                </button>

                <button
                  type="button"
                  className="btn green"
                  disabled={
                    loading ||
                    uploadingImage
                  }
                  onClick={() =>
                    void saveCampaign(
                      'draft',
                      true
                    )
                  }
                >
                  {loading
                    ? '⏳ Preparazione...'
                    : '🚀 Invia campagna'}
                </button>
              </div>

              <p className="muted">
                Durante l’invio vedrai
                avanzamento, percentuale,
                messaggi inviati ed eventuali
                errori in tempo reale.
              </p>

              {sendProgress && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 16,
                    border:
                      '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 14,
                  }}
                >
                  <strong>
                    {sendProgress.active
                      ? '🚀 Invio in corso...'
                      : '✅ Invio terminato'}
                  </strong>

                  <p
                    style={{
                      marginTop: 10,
                      marginBottom: 8,
                    }}
                  >
                    {sendProgress.processed} /{' '}
                    {sendProgress.total}{' '}
                    destinatari elaborati
                  </p>

                  <div
                    style={{
                      width: '100%',
                      height: 18,
                      borderRadius: 999,
                      overflow: 'hidden',
                      background:
                        'rgba(255,255,255,0.12)',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          sendProgress.percent,
                          100
                        )}%`,
                        height: '100%',
                        borderRadius: 999,
                        background:
                          'currentColor',
                        transition:
                          'width 0.35s ease',
                      }}
                    />
                  </div>

                  <p
                    style={{
                      marginTop: 10,
                      marginBottom: 0,
                    }}
                  >
                    <strong>
                      {sendProgress.percent}%
                    </strong>
                    {' · '}✅{' '}
                    {sendProgress.sent}
                    {' · '}❌{' '}
                    {sendProgress.failed}
                    {' · '}⏳{' '}
                    {sendProgress.pending}
                  </p>
                </div>
              )}

              <hr
                style={{
                  margin: '22px 0',
                  opacity: 0.25,
                }}
              />

              <label>
                <strong>
                  Data e ora di invio
                </strong>
              </label>

              <input
                type="datetime-local"
                value={scheduledAt}
                disabled={loading}
                onChange={(event) =>
                  setScheduledAt(
                    event.target.value
                  )
                }
                style={{
                  display: 'block',
                  marginTop: 8,
                  marginBottom: 14,
                }}
              />

              <button
                type="button"
                className="btn green"
                disabled={
                  loading ||
                  uploadingImage
                }
                onClick={() =>
                  void saveCampaign(
                    'scheduled'
                  )
                }
              >
                {loading
                  ? '⏳ Salvataggio...'
                  : '📅 Programma campagna'}
              </button>
            </div>
          </div>

          <div
            className="card"
            style={{
              position: 'sticky',
              top: 20,
            }}
          >
            <h2>
              📱 Anteprima WhatsApp
            </h2>

            <div
              style={{
                background: '#efeae2',
                color: '#111',
                padding: 16,
                borderRadius: 18,
                minHeight: 450,
              }}
            >
              <div
                style={{
                  background: '#075e54',
                  color: '#fff',
                  padding: 14,
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                🍕 Sotto le Stelle
              </div>

              <div
                style={{
                  background: '#fff',
                  padding: 12,
                  borderRadius: 10,
                  marginTop: 18,
                  boxShadow:
                    '0 2px 8px rgba(0,0,0,0.12)',
                }}
              >
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Anteprima messaggio"
                    style={{
                      width: '100%',
                      maxHeight: 230,
                      objectFit: 'cover',
                      borderRadius: 8,
                      marginBottom: 10,
                    }}
                  />
                )}

                <p
                  style={{
                    whiteSpace:
                      'pre-wrap',
                    lineHeight: 1.5,
                  }}
                >
                  {message ||
                    'Il testo apparirà qui.'}
                </p>

                {useBooking && (
                  <div
                    style={{
                      borderTop:
                        '1px solid #ddd',
                      paddingTop: 12,
                      textAlign: 'center',
                      color: '#128c7e',
                      fontWeight: 700,
                    }}
                  >
                    📅 Prenota il tavolo
                  </div>
                )}
              </div>

              <p
                style={{
                  color: '#555',
                  fontSize: 12,
                  marginTop: 14,
                }}
              >
                Anteprima indicativa del
                messaggio che riceverà il
                cliente.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (view === 'campagne') {
    return (
      <section>
        <div className="card">
          <button
            type="button"
            className="btn green"
            disabled={loading}
            onClick={() =>
              setView('home')
            }
          >
            ← Centro Marketing
          </button>
        </div>

        <div className="card">
          <h2>
            📢 Campagne WhatsApp
          </h2>

          <p className="muted">
            Crea e gestisci le campagne
            destinate ai clienti di Sotto
            le Stelle.
          </p>
        </div>

        <div className="dashboard">
          <div className="kpi">
            <span>
              📨 Campagne create
            </span>

            <strong>
              {campaigns.length}
            </strong>

            <small>
              Campagne presenti
            </small>
          </div>

          <div className="kpi">
            <span>
              👥 Destinatari
            </span>

            <strong>
              {totalRecipients}
            </strong>

            <small>
              Totale selezionato
            </small>
          </div>

          <div className="kpi">
            <span>
              📅 Programmate
            </span>

            <strong>
              {scheduledCampaigns}
            </strong>

            <small>
              Invii pianificati
            </small>
          </div>

          <div className="kpi">
            <span>✅ Inviate</span>

            <strong>
              {sentCampaigns}
            </strong>

            <small>
              Invii completati
            </small>
          </div>
        </div>

        <div className="card">
          <button
            type="button"
            className="btn gold"
            disabled={loading}
            onClick={openEditor}
          >
            ➕ Crea nuova campagna
          </button>

          {loading && (
            <span
              style={{
                marginLeft: 12,
              }}
            >
              ⏳ Caricamento...
            </span>
          )}
        </div>

        <div className="card">
          <button
            type="button"
            className="btn green"
            onClick={() =>
              setShowSavedCampaigns(
                (current) => !current
              )
            }
          >
            {showSavedCampaigns
              ? '▲ Nascondi campagne salvate'
              : `📋 Campagne salvate (${campaigns.length})`}
          </button>
        </div>

        {showSavedCampaigns &&
          campaigns.length > 0 && (
          <div className="card">
            <h2>
              📋 Campagne salvate
            </h2>

            <div
              style={{
                overflowX: 'auto',
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Immagine</th>
                    <th>Nome</th>
                    <th>Stato</th>
                    <th>Destinatari</th>
                    <th>Creata</th>
                    <th>
                      Programmata
                    </th>
                    <th>Azioni</th>
                  </tr>
                </thead>

                <tbody>
                  {campaigns.map(
                    (campaign) => (
                      <tr
                        key={campaign.id}
                      >
                        <td>
                          {campaign.image_url ? (
                            <a
                              href={
                                campaign.image_url
                              }
                              target="_blank"
                              rel="noreferrer"
                              title="Apri immagine"
                            >
                              <img
                                src={
                                  campaign.image_url
                                }
                                alt={
                                  campaign.name
                                }
                                style={{
                                  width: 72,
                                  height: 72,
                                  objectFit:
                                    'cover',
                                  borderRadius:
                                    10,
                                }}
                              />
                            </a>
                          ) : (
                            <span className="muted">
                              Nessuna
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>
                            {
                              campaign.name
                            }
                          </strong>
                        </td>

                        <td>
                          {etichettaStato(
                            campaign.status
                          )}
                        </td>

                        <td>
                          {campaign.recipient_count ??
                            campaign
                              .marketing_recipients
                              ?.length ??
                            0}
                        </td>

                        <td>
                          {formattaData(
                            campaign.created_at
                          )}
                        </td>

                        <td>
                          {formattaData(
                            campaign.scheduled_at
                          )}
                        </td>

                        <td>
                          {campaign.status ===
                          'sent' ? (
                            <span className="muted">
                              Completata
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn green"
                              disabled={loading}
                              onClick={() =>
                                void continuaCampagnaSalvata(
                                  campaign
                                )
                              }
                            >
                              ▶ Controlla / continua invio
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="card">
        <h2>📣 Centro Marketing</h2>

        <p className="muted">
          Prima importiamo i contatti, poi
          creiamo campagne che portano
          prenotazioni.
        </p>
      </div>

      <div className="dashboard">
        <div className="kpi gold">
          <span>
            👥 Contatti disponibili
          </span>

          <strong>
            {totalContacts}
          </strong>

          <small>
            Archivio campagne
          </small>
        </div>

        <div className="kpi">
          <span>
            📢 Campagne create
          </span>

          <strong>
            {campaigns.length}
          </strong>

          <small>
            Campagne salvate
          </small>
        </div>

        <div className="kpi">
          <span>
            📅 Programmate
          </span>

          <strong>
            {scheduledCampaigns}
          </strong>

          <small>
            Invii pianificati
          </small>
        </div>

        <div className="kpi">
          <span>
            ✅ Inviate
          </span>

          <strong>
            {sentCampaigns}
          </strong>

          <small>
            Invii completati
          </small>
        </div>
      </div>

      <div className="card">
        <h2>🧪 Prova collegamento WhatsApp</h2>

        <p className="muted">
          Inserisci il numero verificato su Meta.
          Il gestionale invierà il template di prova
          “Hello World”.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <input
            type="tel"
            value={testPhone}
            disabled={sendingTest}
            onChange={(event) =>
              setTestPhone(
                event.target.value
              )
            }
            placeholder="Esempio: +39 333 1234567"
            style={{
              flex: '1 1 280px',
              maxWidth: 420,
            }}
          />

          <button
            type="button"
            className="btn green"
            disabled={sendingTest}
            onClick={() =>
              void sendWhatsAppTest()
            }
          >
            {sendingTest
              ? '⏳ Invio in corso...'
              : '🧪 Invia test WhatsApp'}
          </button>
        </div>

        {testResult && (
          <p
            style={{
              marginTop: 14,
              fontWeight: 700,
            }}
          >
            {testResult}
          </p>
        )}
      </div>

      <div className="quick-grid">
        <button
          type="button"
          className="card module-card module-button"
          onClick={() =>
            setView('contatti')
          }
        >
          <h2>👥 Contatti</h2>

          <p className="muted">
            Importa file Excel o CSV senza
            inserire numeri doppi.
          </p>

          <strong>
            ▶ Gestisci contatti
          </strong>
        </button>

        <button
          type="button"
          className="card module-card module-button"
          onClick={() =>
            setView('campagne')
          }
        >
          <h2>📢 Campagne</h2>

          <p className="muted">
            Crea campagne usando tutto
            l’archivio oppure numeri manuali.
          </p>

          <strong>
            ▶ Gestisci campagne
          </strong>
        </button>
      </div>
    </section>
  );
}
