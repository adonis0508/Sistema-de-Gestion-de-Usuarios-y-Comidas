import React from 'react';
import { Info, MessageCircle, Bug, Lightbulb, Facebook } from 'lucide-react';

export default function AboutView() {
  const whatsappNumber = "542216828422";
  const whatsappMessage = encodeURIComponent("ST Llanos, le escribo por la app del Casino de Oficiales para comentarle lo siguiente: ");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0 pb-10">
      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
        <div className="bg-blue-950 px-6 py-4 border-b border-yellow-600/30 flex items-center">
          <Info className="mr-3 h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Acerca de la App</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <img src="/DEf.png" alt="Agr Com 601" className="h-20 w-20 object-contain drop-shadow-lg" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Sistema de Gestión - Casino de Oficiales</h3>
            <p className="text-yellow-500 text-sm font-bold tracking-widest uppercase">Agrupación de Comunicaciones 601</p>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 space-y-4">
            <h4 className="text-yellow-500 font-bold uppercase tracking-widest text-sm border-b border-slate-700 pb-2">
              Soporte Técnico y Sugerencias
            </h4>
            
            <div className="space-y-4 text-slate-300 text-sm">
              <p>Si el usuario encuentra algún error en el sistema o tiene sugerencias para mejorar la aplicación, puede comunicarse directamente con el desarrollador a través de los siguientes medios.</p>
              
              <div className="bg-slate-800 p-4 rounded border border-slate-600 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-xs sm:w-32 mb-1 sm:mb-0">Desarrollador:</span>
                  <span className="text-white font-bold">ST Angel Adonis LLANOS</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-xs sm:w-32 mb-1 sm:mb-0">WhatsApp:</span>
                  <span className="text-white font-bold">+54 9 221 682-8422</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center px-4 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-md transition-colors uppercase tracking-wider text-sm shadow-lg shadow-green-900/20"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Contactar por WhatsApp
              </a>
              <a 
                href="https://www.facebook.com/angeladonis.llanos"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center px-4 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold rounded-md transition-colors uppercase tracking-wider text-sm shadow-lg shadow-blue-900/20"
              >
                <Facebook className="mr-2 h-5 w-5" />
                Contactar por Facebook
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-600 p-4 rounded-lg flex items-start space-x-3">
              <Bug className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-white font-bold text-sm uppercase tracking-wider">Reportar Errores</h5>
                <p className="text-slate-400 text-xs mt-1">Si alguna función presenta fallas, enviar una captura de pantalla ayuda a solucionarlo rápidamente.</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-600 p-4 rounded-lg flex items-start space-x-3">
              <Lightbulb className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-white font-bold text-sm uppercase tracking-wider">Sugerencias</h5>
                <p className="text-slate-400 text-xs mt-1">Se reciben nuevas ideas para mejorar la experiencia y funcionalidad del sistema para todos los usuarios.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
