"""
Skills Platform - Servicio de Anthropic
Maneja la comunicación con la API de Claude
"""
import anthropic
from typing import Dict, Optional
from config import settings
from skills_service import skill_service


class AnthropicService:
    """Servicio para interactuar con la API de Anthropic"""
    
    def __init__(self):
        self.client = None
        if settings.ANTHROPIC_API_KEY:
            self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    def is_configured(self) -> bool:
        """Verifica si la API está configurada"""
        return self.client is not None
    
    async def execute_skill(
        self,
        skill_id: str,
        user_inputs: Dict[str, str],
        document_text: Optional[str] = None,
        max_tokens: int = 4096
    ) -> Dict:
        """
        Ejecuta un skill con los inputs del usuario.
        El contenido del skill nunca se expone en la respuesta.
        Si se proporciona document_text, se incluye como contexto.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "API de Anthropic no configurada. Configure ANTHROPIC_API_KEY.",
                "output": None
            }

        # Construir el prompt (internamente carga el skill)
        prompt_data = skill_service.build_prompt(skill_id, user_inputs, document_text)
        if not prompt_data:
            return {
                "success": False,
                "error": f"Skill '{skill_id}' no encontrado",
                "output": None
            }
        
        try:
            # Llamar a la API de Anthropic
            message = self.client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=max_tokens,
                system=prompt_data["system"],
                messages=[
                    {"role": "user", "content": prompt_data["user"]}
                ]
            )
            
            # Extraer la respuesta
            output_text = ""
            for block in message.content:
                if hasattr(block, 'text'):
                    output_text += block.text
            
            return {
                "success": True,
                "error": None,
                "output": output_text,
                "tokens_used": message.usage.input_tokens + message.usage.output_tokens,
                "model": message.model
            }
            
        except anthropic.APIError as e:
            return {
                "success": False,
                "error": f"Error de API: {str(e)}",
                "output": None
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error inesperado: {str(e)}",
                "output": None
            }


# Instancia global
anthropic_service = AnthropicService()
