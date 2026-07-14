"""
email_sender.py
================

Construction et envoi de l'e-mail d'alerte via SMTP Gmail.

Les identifiants (adresse, mot de passe d'application, destinataire) sont
lus exclusivement depuis les variables d'environnement (voir config.py),
jamais codés en dur ici.
"""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List

from config import Settings
from exceptions import EmailSendError
from logger import get_logger
from storage import Housing
from utils import now_french_datetime, retry_with_backoff

logger = get_logger(__name__)

_SUBJECT = "🚨 Nouveau logement CROUS disponible à Grenoble"


class EmailSender:
    """Construit et envoie les e-mails d'alerte pour les nouveaux logements."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def send_new_housing_alert(self, new_housings: List[Housing], total_count: int) -> None:
        """
        Envoie un e-mail d'alerte listant les nouveaux logements détectés.

        Args:
            new_housings: logements nouvellement apparus depuis le dernier passage.
            total_count: nombre total de logements actuellement détectés (toutes annonces).
        """
        if self.settings.dry_run:
            logger.info(
                "[DRY_RUN] E-mail non envoyé (mode test). %d nouveauté(s) auraient été signalées.",
                len(new_housings),
            )
            return

        date_str, time_str = now_french_datetime()
        html_body = _build_html_body(new_housings, total_count, date_str, time_str)
        text_body = _build_text_body(new_housings, total_count, date_str, time_str)

        message = MIMEMultipart("alternative")
        message["Subject"] = _SUBJECT
        message["From"] = self.settings.email_sender
        message["To"] = self.settings.email_receiver
        message.attach(MIMEText(text_body, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))

        self._send(message)

    def _send(self, message: MIMEMultipart) -> None:
        @retry_with_backoff(
            max_retries=self.settings.max_retries,
            base_seconds=self.settings.backoff_base_seconds,
            exceptions=(smtplib.SMTPException, OSError),
        )
        def _do_send() -> None:
            logger.info("Envoi de l'e-mail d'alerte à %s...", self.settings.email_receiver)
            with smtplib.SMTP_SSL(self.settings.smtp_host, self.settings.smtp_port, timeout=self.settings.request_timeout) as server:
                server.login(self.settings.email_sender, self.settings.email_password)
                server.sendmail(
                    self.settings.email_sender,
                    [self.settings.email_receiver],
                    message.as_string(),
                )
            logger.info("Mail envoyé.")

        try:
            _do_send()
        except (smtplib.SMTPException, OSError) as exc:
            raise EmailSendError(
                f"Impossible d'envoyer l'e-mail après {self.settings.max_retries} tentative(s) : {exc}"
            ) from exc


def _build_text_body(housings: List[Housing], total_count: int, date_str: str, time_str: str) -> str:
    lines = [
        "Nouveau(x) logement(s) CROUS disponible(s) à Grenoble !",
        f"Détecté le {date_str} à {time_str}",
        "",
        f"Nombre total de logements actuellement détectés : {total_count}",
        "",
    ]
    for h in housings:
        lines.extend(
            [
                f"- Résidence : {h.residence}",
                f"  Type      : {h.type_logement}",
                f"  Prix      : {h.prix}",
                f"  Surface   : {h.surface}",
                f"  Adresse   : {h.adresse}",
                f"  Lien      : {h.lien}",
                "",
            ]
        )
    return "\n".join(lines)


def _build_html_body(housings: List[Housing], total_count: int, date_str: str, time_str: str) -> str:
    cards_html = "".join(_housing_card_html(h) for h in housings)

    return f"""\
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f2f4f6; font-family:Segoe UI, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f6; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#000091; padding:24px 32px;">
              <h1 style="color:#ffffff; font-size:20px; margin:0;">🚨 Nouveau logement CROUS à Grenoble</h1>
              <p style="color:#c9c9f5; font-size:13px; margin:8px 0 0;">Détecté le {date_str} à {time_str}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:14px; color:#333333; margin:0 0 16px;">
                <strong>{len(housings)}</strong> nouveau(x) logement(s) viennent d'apparaître.
                Nombre total de logements actuellement en ligne pour Grenoble : <strong>{total_count}</strong>.
              </p>
              {cards_html}
              <p style="font-size:12px; color:#888888; margin-top:24px;">
                Cette alerte a été générée automatiquement par votre système de surveillance CROUS Grenoble.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _housing_card_html(h: Housing) -> str:
    equip_html = (
        f'<p style="font-size:13px; color:#555555; margin:4px 0 0;">🧰 {h.equipements}</p>'
        if h.equipements
        else ""
    )
    return f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="border:1px solid #e0e0e0; border-radius:8px; margin-bottom:16px;">
  <tr>
    <td style="padding:16px;">
      <h2 style="font-size:16px; color:#000091; margin:0 0 8px;">{h.residence}</h2>
      <p style="font-size:14px; color:#333333; margin:2px 0;">💶 <strong>{h.prix}</strong> &nbsp;|&nbsp; 📐 {h.surface} &nbsp;|&nbsp; 🏠 {h.type_logement}</p>
      <p style="font-size:13px; color:#555555; margin:4px 0;">📍 {h.adresse}</p>
      {equip_html}
      <p style="margin:12px 0 0;">
        <a href="{h.lien}" style="display:inline-block; background-color:#000091; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:6px; font-size:13px;">
          Voir l'annonce
        </a>
      </p>
    </td>
  </tr>
</table>
"""
