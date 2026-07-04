import { useState } from "react";
import { ChevronDown } from "lucide-react";

const questions = [
  {
    question: "מתי צפוי האכלוס?",
    answer: "האכלוס המתוכנן מופיע בכרטיס הפרויקט, לפי שלב הביצוע הנוכחי.",
  },
  {
    question: "האם ניתן לבצע שינויים בדירה?",
    answer: "בשלב המכר הנוכחי ניתן לסמן התאמות עקרוניות לבדיקת מחלקת שינויי דיירים.",
  },
  {
    question: "מה כולל המחסן?",
    answer: "המחסן מוצמד לדירה בהתאם למפרט הדירה ולמחירון המוצג בפגישה.",
  },
  {
    question: "האם יש חניה לכל דירה?",
    answer: "ברוב הדירות קיימת חניה מוצמדת, ובחלק מהדירות קיימת חניה כפולה.",
  },
  {
    question: "מה כולל המפרט הטכני?",
    answer: "המפרט כולל חיפויים, ריצוף, מטבח, מיזוג, חשמל והכנות לבית חכם.",
  },
];

export function FAQScreen() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="faq-list">
      {questions.map((item, index) => (
        <article className={`faq-item ${openIndex === index ? "open" : ""}`} key={item.question}>
          <button onClick={() => setOpenIndex(openIndex === index ? -1 : index)}>
            <span>{item.question}</span>
            <ChevronDown size={20} />
          </button>
          {openIndex === index && <p>{item.answer}</p>}
        </article>
      ))}
    </section>
  );
}
